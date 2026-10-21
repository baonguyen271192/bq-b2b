"""Webhook Facebook Messenger.

Ba đường:
  GET  /api/bot/webhook   Meta xác minh khi đăng ký (hub.challenge)
  POST /api/bot/webhook   Meta đẩy tin của khách vào
  POST /api/bot/simulate  Chạy thử luồng hội thoại KHÔNG cần Facebook

Bảo mật: mọi POST từ Meta phải có chữ ký `X-Hub-Signature-256` khớp với
`FB_APP_SECRET`. Thiếu secret thì đường này TẮT — không mở sẵn. Webhook là URL
công khai; để hở nghĩa là ai cũng giả làm Facebook, nhét hội thoại và tạo đơn.
"""

from __future__ import annotations

import hashlib
import hmac
import os

from fastapi import APIRouter, BackgroundTasks, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse

from . import engine, messenger, session

router = APIRouter(prefix="/api/bot", tags=["bot bán lẻ"])


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


# --- Meta xác minh khi đăng ký webhook --------------------------------------

@router.get("/webhook")
async def verify(request: Request):
    """Meta gọi một lần lúc đăng ký: trả lại `hub.challenge` nếu token khớp."""
    want = _env("FB_VERIFY_TOKEN")
    if not want:
        return PlainTextResponse("Chưa cấu hình FB_VERIFY_TOKEN", status_code=503)

    q = request.query_params
    if q.get("hub.mode") == "subscribe" and q.get("hub.verify_token") == want:
        return PlainTextResponse(q.get("hub.challenge", ""))
    return PlainTextResponse("Token xác minh không khớp", status_code=403)


# --- Meta đẩy tin vào --------------------------------------------------------

def _signature_ok(body: bytes, header: str | None) -> bool:
    secret = _env("FB_APP_SECRET")
    if not secret or not header or not header.startswith("sha256="):
        return False
    mine = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(mine, header[len("sha256="):])


def _incoming(payload: dict) -> list[tuple[str, str]]:
    """Lọc ra (sender_id, text) thật sự cần trả lời.

    Bỏ qua: tin do chính Trang gửi (`is_echo` — không thì bot tự nói với chính
    mình thành vòng lặp), biên nhận đã gửi/đã đọc, và tin chỉ có ảnh/sticker.
    """
    out = []
    for entry in payload.get("entry", []):
        for ev in entry.get("messaging", []):
            sender = (ev.get("sender") or {}).get("id")
            if not sender:
                continue
            if ev.get("postback"):
                text = (ev["postback"].get("payload")
                        or ev["postback"].get("title") or "")
                if text:
                    out.append((sender, text))
                continue
            msg = ev.get("message") or {}
            if msg.get("is_echo"):
                continue
            qr = (msg.get("quick_reply") or {}).get("payload")
            text = qr or msg.get("text") or ""
            if text:
                out.append((sender, text))
    return out


async def _reply(sender_id: str, text: str) -> None:
    try:
        for m in engine.handle(sender_id, text, channel="facebook"):
            await messenger.send(sender_id, m)
    except Exception as e:  # noqa: BLE001 — một khách lỗi không được kéo sập webhook
        print(f"[bot] lỗi khi trả lời {sender_id}: {e}")


@router.post("/webhook")
async def receive(request: Request, tasks: BackgroundTasks):
    """Nhận sự kiện và trả 200 NGAY.

    Meta coi phản hồi chậm quá là hỏng và gửi lại cùng sự kiện — khách sẽ nhận
    câu trả lời hai lần. Nên xử lý hội thoại đẩy sang nền.
    """
    if not _env("FB_APP_SECRET"):
        return JSONResponse(
            {"detail": "Chưa cấu hình FB_APP_SECRET — webhook đang tắt."},
            status_code=503)

    body = await request.body()
    if not _signature_ok(body, request.headers.get("X-Hub-Signature-256")):
        return JSONResponse({"detail": "Chữ ký không hợp lệ"}, status_code=401)

    import json
    try:
        payload = json.loads(body)
    except ValueError:
        return JSONResponse({"detail": "Body không phải JSON"}, status_code=400)

    if payload.get("object") != "page":
        return Response(status_code=200)

    for sender_id, text in _incoming(payload):
        tasks.add_task(_reply, sender_id, text)
    session.sweep()
    return Response(status_code=200)


# --- Chạy thử không cần Facebook --------------------------------------------

@router.post("/simulate")
async def simulate(body: dict):
    """Gửi một câu như thể khách nhắn, nhận lại đúng những tin bot sẽ trả lời.

    Dùng để kiểm toàn bộ luồng trước khi Meta duyệt Trang. Đơn chốt qua đường này
    là ĐƠN THẬT trong DB — nên phải bật rõ ràng bằng `BQ_BOT_SIMULATE=1`, không
    để chạy mặc định trên môi trường thật.
    """
    if _env("BQ_BOT_SIMULATE") != "1":
        return JSONResponse(
            {"detail": "Tắt. Đặt BQ_BOT_SIMULATE=1 để bật chế độ chạy thử."},
            status_code=403)

    sender = str(body.get("sender_id") or "sim-user")
    text = str(body.get("text") or "")
    messages = engine.handle(sender, text, channel=str(body.get("channel") or "facebook"))
    return {"sender_id": sender, "messages": messages,
            "state": session.get(sender)["state"]}

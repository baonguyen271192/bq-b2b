"""Gửi tin qua Facebook Messenger Send API.

Chuyển tin nội bộ ({text | generic, quick_replies}) sang payload Messenger. Giữ
đúng giới hạn của nền tảng (tiêu đề 80 ký tự, nút 20, tối đa 3 nút / 10 thẻ /
13 quick reply) — vượt là Graph API trả 400 và khách không nhận được gì.
"""

from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.parse
import urllib.request

GRAPH_URL = "https://graph.facebook.com/v21.0/me/messages"


def _elements(items: list[dict]) -> list[dict]:
    out = []
    for el in items[:10]:
        item = {"title": el["title"][:80]}
        if el.get("subtitle"):
            item["subtitle"] = el["subtitle"][:80]
        if el.get("image_url"):
            item["image_url"] = el["image_url"]
        if el.get("buttons"):
            item["buttons"] = [
                {"type": "postback", "title": b["title"][:20], "payload": b["payload"]}
                for b in el["buttons"][:3]
            ]
        out.append(item)
    return out


def to_payload(recipient_id: str, message: dict) -> dict:
    if message.get("type") == "generic":
        body = {"attachment": {"type": "template", "payload": {
            "template_type": "generic",
            "elements": _elements(message["elements"]),
        }}}
    else:
        body = {"text": message.get("text", "")[:2000]}

    if message.get("quick_replies"):
        body["quick_replies"] = [
            {"content_type": "text", "title": q["title"][:20], "payload": q["payload"]}
            for q in message["quick_replies"][:13]
        ]
    return {"recipient": {"id": recipient_id}, "message": body,
            "messaging_type": "RESPONSE"}


def token() -> str:
    return os.getenv("FB_PAGE_ACCESS_TOKEN", "").strip()


async def send(recipient_id: str, message: dict) -> bool:
    """Gửi một tin. Trả False nếu chưa cấu hình token hoặc Graph API từ chối.

    CHƯA CÓ TOKEN KHÔNG PHẢI LÀ LỖI: lúc chưa được Meta duyệt, webhook vẫn phải
    chạy để kiểm luồng hội thoại. Khi đó chỉ ghi log — tin "gửi" đi đâu thì nhìn
    log biết, và `/api/bot/simulate` trả thẳng nội dung về cho người test.
    """
    tok = token()
    if not tok:
        print(f"[messenger] (chưa có token) -> {recipient_id}: "
              f"{message.get('text', '[thẻ sản phẩm]')[:90]}")
        return False

    # urllib là đồng bộ; đẩy sang thread để không chặn vòng lặp sự kiện. Dùng
    # urllib thay vì httpx có chủ ý: service này đã gọi HTTP bằng stdlib ở
    # bq_client, thêm một thư viện nữa là thêm thứ BQ phải thẩm định khi bàn giao.
    return await asyncio.to_thread(_post_sync, recipient_id, message, tok)


def _post_sync(recipient_id: str, message: dict, tok: str) -> bool:
    url = f"{GRAPH_URL}?{urllib.parse.urlencode({'access_token': tok})}"
    req = urllib.request.Request(
        url,
        data=json.dumps(to_payload(recipient_id, message), ensure_ascii=False)
            .encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10):
            return True
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        print(f"[messenger] LỖI {e.code} -> {recipient_id}: {detail}")
    except Exception as e:  # noqa: BLE001 — lỗi mạng không được kéo sập webhook
        print(f"[messenger] LỖI mạng -> {recipient_id}: {e}")
    return False


async def send_all(recipient_id: str, messages: list[dict]) -> int:
    sent = 0
    for m in messages:
        if await send(recipient_id, m):
            sent += 1
    return sent

"""Máy trạng thái hội thoại bán lẻ.

Một lượt vào là `(sender_id, text)`, một danh sách tin nhắn đi ra. Không I/O mạng
trực tiếp: danh mục qua `catalog`, chốt đơn qua `bq_client`. Nhờ vậy test được
toàn bộ luồng bằng hàm thuần, không cần Facebook.

Vì sao là máy trạng thái chứ không giao hết cho LLM: chốt đơn là việc có tiền. LLM
đoán sai size hay số lượng thì khách nhận nhầm hàng và BQ chịu phí trả lại. LLM chỉ
dùng cho câu hỏi tự do — mọi bước dẫn tới đơn đều đi qua luật tường minh.
"""

from __future__ import annotations

import os
import re
import time

from .. import bq_client
from ..assistant import fmt_vnd, llm_json, parse_qty, parse_sizes, strip_accents
from . import catalog, policies, session

MAX_PER_SIZE = 50   # chặn gõ nhầm "size 39 lấy 200 đôi"


# --- Dựng tin nhắn ----------------------------------------------------------

def _text(body: str, quick_replies: list[tuple[str, str]] | None = None) -> dict:
    m: dict = {"text": body}
    if quick_replies:
        m["quick_replies"] = [{"title": t, "payload": p} for t, p in quick_replies]
    return m


def _cards(elements: list[dict],
           quick_replies: list[tuple[str, str]] | None = None) -> dict:
    m: dict = {"type": "generic", "elements": elements}
    if quick_replies:
        m["quick_replies"] = [{"title": t, "payload": p} for t, p in quick_replies]
    return m


def _product_card(p: dict) -> dict:
    sizes = catalog.sizes_in_stock(p)
    return {
        "title": p["name"],
        "subtitle": f"{fmt_vnd(catalog.retail_price(p))} · size "
                    + (", ".join(sizes) if sizes else "tạm hết"),
        "image_url": p.get("image"),
        "buttons": [{"title": "Chọn size", "payload": f"PICK:{p['code']}"}],
    }


_HOME_QR = [("Xem hàng", "BROWSE"), ("Giỏ hàng", "CART"), ("Tư vấn", "HELP")]


# --- Các bước ---------------------------------------------------------------

def _welcome(sess: dict) -> list[dict]:
    sess["state"] = "idle"
    return [_text(
        "Dạ em chào anh/chị 👋 Em là trợ lý của Giày BQ.\n"
        "Anh/chị xem mẫu, hỏi giá hay đặt hàng đều được ạ. "
        "Nhắn kiểu “giày cao gót nữ” hoặc gõ mã trên ảnh cũng được.",
        _HOME_QR)]


def _browse(sess: dict) -> list[dict]:
    sess["state"] = "browsing"
    cats = catalog.categories()
    if not cats:
        return [_text("Dạ em đang không lấy được danh mục, anh/chị thử lại giúp em ạ.")]
    return [_text("Anh/chị muốn xem nhóm nào ạ?",
                  [(c, f"CAT:{c}") for c in cats] + [("Giỏ hàng", "CART")])]


def _show_category(sess: dict, name: str) -> list[dict]:
    items = catalog.in_category(name, limit=10)
    if not items:
        return [_text(f"Dạ nhóm “{name}” đang chưa có mẫu nào ạ.", _HOME_QR)]
    sess["state"] = "browsing"
    return [_cards([_product_card(p) for p in items],
                   [("Nhóm khác", "BROWSE"), ("Giỏ hàng", "CART")])]


def _show_results(sess: dict, items: list[dict]) -> list[dict]:
    if len(items) == 1:
        return _focus(sess, items[0]["code"])
    sess["state"] = "browsing"
    return [_text(f"Dạ em tìm được {len(items)} mẫu, anh/chị xem thử ạ:"),
            _cards([_product_card(p) for p in items[:10]],
                   [("Xem nhóm khác", "BROWSE"), ("Giỏ hàng", "CART")])]


def _focus(sess: dict, code: str) -> list[dict]:
    p = catalog.get(code)
    if not p:
        return [_text("Dạ em không tìm thấy mã này ạ.", _HOME_QR)]

    sizes = catalog.sizes_in_stock(p)
    if not sizes:
        return [_text(f"Dạ {p['name']} đang hết hàng toàn bộ size ạ. "
                      f"Anh/chị xem mẫu khác giúp em nhé.",
                      [("Xem mẫu khác", "BROWSE")])]

    sess["focus"] = p["code"]
    sess["state"] = "sizing"
    lines = "\n".join(f"  • Size {s}: còn {catalog.stock(p, s)} đôi" for s in sizes)
    return [_text(
        f"{p['name']}\nGiá: {fmt_vnd(catalog.retail_price(p))}/đôi\n\n{lines}\n\n"
        "Anh/chị cho em xin size và số lượng ạ (ví dụ: “39 lấy 2 đôi”).",
        [("Xem mẫu khác", "BROWSE"), ("Giỏ hàng", "CART")])]


def _add_to_cart(sess: dict, text: str) -> list[dict] | None:
    """Thêm vào giỏ từ câu kiểu “39 lấy 2 đôi”. None = không hiểu, để lớp trên xử lý."""
    code = sess.get("focus")
    p = catalog.get(code) if code else None
    if not p:
        return None

    norm = strip_accents(text)
    sizes = parse_sizes(norm)
    if not sizes:
        return None
    qty = parse_qty(norm) or 1

    if qty > MAX_PER_SIZE:
        return [_text(f"Dạ mỗi size em nhận tối đa {MAX_PER_SIZE} đôi ạ. "
                      "Anh/chị cần nhiều hơn thì bên em có giá sỉ cho đại lý, "
                      "em nối máy kinh doanh nhé?")]

    added, refused = {}, []
    for s in sizes:
        have = catalog.stock(p, s)
        if have <= 0:
            refused.append(f"size {s} đã hết")
            continue
        take = min(qty, have)
        if take < qty:
            refused.append(f"size {s} chỉ còn {have} đôi")
        added[s] = added.get(s, 0) + take

    if not added:
        return [_text("Dạ " + ", ".join(refused) + " ạ. Anh/chị chọn size khác giúp em nhé.")]

    line = next((i for i in sess["cart"] if i["code"] == p["code"]), None)
    if line is None:
        line = {"code": p["code"], "name": p["name"], "sizes": {},
                "unit_price": catalog.retail_price(p)}
        sess["cart"].append(line)
    for s, n in added.items():
        line["sizes"][s] = line["sizes"].get(s, 0) + n

    note = ("\n(" + ", ".join(refused) + ")") if refused else ""
    detail = ", ".join(f"size {s} × {n}" for s, n in added.items())
    return [_text(f"Dạ em thêm {detail} vào giỏ rồi ạ.{note}")] + _cart(sess)


def _cart_total(sess: dict) -> int:
    return sum(i["unit_price"] * sum(i["sizes"].values()) for i in sess["cart"])


def _cart(sess: dict) -> list[dict]:
    if not sess["cart"]:
        sess["state"] = "idle"
        return [_text("Dạ giỏ hàng đang trống ạ.", _HOME_QR)]

    sess["state"] = "cart"
    lines = []
    for i in sess["cart"]:
        detail = ", ".join(f"size {s}×{n}" for s, n in sorted(i["sizes"].items()))
        qty = sum(i["sizes"].values())
        lines.append(f"  • {i['name']}\n    {detail} = {qty} đôi · "
                     f"{fmt_vnd(i['unit_price'] * qty)}")
    return [_text("🛒 Giỏ hàng của anh/chị:\n" + "\n".join(lines)
                  + f"\n\nTổng: {fmt_vnd(_cart_total(sess))}",
                  [("Đặt hàng", "CHECKOUT"), ("Mua thêm", "BROWSE"),
                   ("Xoá giỏ", "CLEAR")])]


# --- Chốt đơn ---------------------------------------------------------------

_PHONE = re.compile(r"0\d{9}\b")


def _checkout(sess: dict) -> list[dict]:
    if not sess["cart"]:
        return _cart(sess)
    sess["state"] = "ask_name"
    return [_text("Dạ em xin tên người nhận ạ.")]


def _ask_phone(sess: dict, name: str) -> list[dict]:
    sess["customer"]["name"] = name.strip()[:60]
    sess["state"] = "ask_phone"
    return [_text("Dạ em xin số điện thoại ạ (ví dụ 0912345678).")]


def _ask_address(sess: dict, text: str) -> list[dict]:
    m = _PHONE.search(re.sub(r"[.\s-]", "", text))
    if not m:
        return [_text("Dạ số này em chưa nhận ra, anh/chị cho em xin số 10 chữ số "
                      "bắt đầu bằng 0 ạ.")]
    sess["customer"]["phone"] = m.group(0)
    sess["state"] = "ask_address"
    return [_text("Dạ em xin địa chỉ giao hàng ạ.")]


def _ask_payment(sess: dict, address: str) -> list[dict]:
    # Địa chỉ quá ngắn gần như chắc chắn là gõ thiếu. Để lọt thì shipper gọi lại,
    # khách bực, đơn dễ bị huỷ.
    if len(address.strip()) < 8:
        return [_text("Dạ địa chỉ hơi ngắn, anh/chị ghi giúp em số nhà, đường, "
                      "phường/xã và tỉnh/thành ạ.")]
    sess["customer"]["address"] = address.strip()[:200]
    sess["state"] = "ask_payment"
    return [_text("Dạ anh/chị thanh toán kiểu nào ạ?",
                  [("Nhận hàng trả tiền", "PAY:COD"), ("Chuyển khoản", "PAY:CK")])]


def _review(sess: dict) -> list[dict]:
    sess["state"] = "review"
    c = sess["customer"]
    lines = [f"  • {i['name']} — "
             + ", ".join(f"size {s}×{n}" for s, n in sorted(i["sizes"].items()))
             for i in sess["cart"]]
    return [_text(
        "Dạ em xin xác nhận lại đơn ạ:\n" + "\n".join(lines)
        + f"\n\nNgười nhận: {c['name']} · {c['phone']}\nĐịa chỉ: {c['address']}\n"
          f"Thanh toán: {sess['payment']}\nTổng tiền: {fmt_vnd(_cart_total(sess))}",
        [("Xác nhận đặt", "CONFIRM"), ("Sửa lại", "CHECKOUT"), ("Huỷ", "CLEAR")])]


def _submit(sess: dict) -> list[dict]:
    key = os.getenv("BQ_RETAIL_INGEST_KEY", "").strip()
    if not key:
        # Fail closed giống backend: thà xin lỗi khách còn hơn im lặng đánh mất đơn.
        print("[bot] THIẾU BQ_RETAIL_INGEST_KEY — không gửi đơn được")
        return [_text("Dạ hệ thống đặt hàng đang bảo trì, em xin phép ghi lại và "
                      "gọi lại cho anh/chị ngay ạ.")]

    items = [{
        "code": i["code"], "name": i["name"],
        "sizes": {s: n for s, n in i["sizes"].items() if n > 0},
        "unit_price": i["unit_price"],
    } for i in sess["cart"]]
    subtotal = _cart_total(sess)
    c = sess["customer"]
    payload = {
        "items": items, "subtotal": subtotal, "payment": sess["payment"],
        "channel": sess["channel"], "sender_id": sess["sender_id"],
        "customer_name": c["name"], "customer_phone": c["phone"],
        "customer_address": c["address"], "flagged": False,
        # Mạng chập chờn khiến Messenger gửi lại cùng một sự kiện. Khoá này để
        # backend nhận ra đơn trùng thay vì lên hai đơn cho khách.
        "idempotency_key": f"{sess['sender_id']}:{int(time.time())}",
    }

    try:
        order = bq_client.create_retail_order(payload, key)
    except bq_client.BqApiError as e:
        print(f"[bot] chốt đơn hỏng: {e}")
        return [_text("Dạ em chưa ghi được đơn, anh/chị đợi em một chút rồi "
                      "bấm “Xác nhận đặt” lại giúp em ạ.",
                      [("Xác nhận đặt", "CONFIRM")])]

    session.reset(sess["sender_id"])
    return [_text(
        f"Dạ em đã nhận đơn {order['id']} ạ 🎉\n"
        f"Tổng: {fmt_vnd(subtotal)} · {sess['payment']}\n"
        "Bên em sẽ gọi xác nhận trước khi giao. Cảm ơn anh/chị nhiều ạ!",
        [("Mua tiếp", "BROWSE")])]


# --- Trả lời tự do ----------------------------------------------------------

_SYS = (
    "Bạn là nhân viên tư vấn của Giày BQ, nhắn tin với KHÁCH LẺ trên Facebook. "
    "Xưng 'em', gọi khách 'anh/chị'. Trả lời NGẮN, tối đa 3 câu, giọng thân thiện. "
    "CHỈ dùng dữ liệu trong DATA; không bịa mẫu giày, giá hay chính sách. "
    "Thông tin nào KHÔNG có trong DATA thì nói thẳng là em chưa có thông tin "
    "và mời khách để lại số điện thoại — TUYỆT ĐỐI không tự nghĩ ra phí ship, "
    "thời gian giao hay chính sách đổi trả. "
    'Trả về JSON: {"answer": "..."}'
)


# Dấu hiệu khách đang HỎI chứ không tìm hàng. Không có bộ lọc này thì "bao lâu thì
# nhận được hàng" khớp trúng một mẫu giày chỉ vì chung token "nhan" ("nhấn quai hậu")
# — khách hỏi thời gian giao, bot dúi cho cái giày.
_ASKING = (
    "bao lau", "khi nao", "may ngay", "bao nhieu lau", "ship", "giao hang",
    "van chuyen", "doi tra", "tra hang", "bao hanh", "khuyen mai", "giam gia",
    "thanh toan", "chuyen khoan", "cod", "dia chi shop", "o dau", "mo cua",
    "co ship", "phi ship", "freeship", "hoa don", "xuat hoa don",
)


def _is_asking(norm: str) -> bool:
    return any(k in norm for k in _ASKING)


def _free_answer(sess: dict, text: str) -> list[dict]:
    """Câu không khớp luật nào. Hỏi chính sách thì nhờ LLM, còn lại thử tìm hàng."""
    norm = strip_accents(text)
    found = [] if _is_asking(norm) else catalog.search(text, limit=6)
    if found:
        return _show_results(sess, found)

    # Chính sách để trống thì LLM phải nói "chưa có thông tin" — đã dặn trong _SYS.
    data = {"danh_muc": catalog.categories(),
            "gio_hang": [i["name"] for i in sess["cart"]],
            "chinh_sach_ban_le": policies.load()}
    out = llm_json(_SYS, data, text) or {}
    answer = (out.get("answer") or "").strip()
    if not answer:
        answer = ("Dạ em chưa rõ ý anh/chị ạ. Anh/chị cho em xin tên mẫu, "
                  "mã giày hoặc bấm “Xem hàng” giúp em nhé.")
    return [_text(answer, _HOME_QR)]


# --- Cổng vào ---------------------------------------------------------------

_GREETING = ("hi", "hello", "alo", "chao", "xin chao", "menu", "bat dau", "start")


def handle(sender_id: str, text: str, channel: str = "facebook") -> list[dict]:
    sess = session.get(sender_id, channel)
    raw = (text or "").strip()
    if not raw:
        return _welcome(sess)

    # 1) Postback từ nút bấm — tường minh, xử lý trước mọi suy đoán.
    if raw.startswith("PICK:"):
        return _focus(sess, raw[5:])
    if raw.startswith("CAT:"):
        return _show_category(sess, raw[4:])
    if raw.startswith("PAY:"):
        sess["payment"] = "Nhận hàng trả tiền (COD)" if raw[4:] == "COD" else "Chuyển khoản"
        return _review(sess)
    if raw == "BROWSE":
        return _browse(sess)
    if raw == "CART":
        return _cart(sess)
    if raw == "CHECKOUT":
        return _checkout(sess)
    if raw == "CONFIRM":
        return _submit(sess) if sess["state"] == "review" else _cart(sess)
    if raw == "CLEAR":
        session.reset(sender_id)
        return _welcome(session.get(sender_id, channel))
    if raw == "HELP":
        return _free_answer(sess, "tư vấn giúp em")

    norm = strip_accents(raw)

    # 2) Đang hỏi thông tin giao hàng: ưu tiên tuyệt đối, đừng diễn giải lại thành
    #    tìm kiếm — tên khách có thể trùng tên mẫu giày.
    state = sess["state"]
    if state == "ask_name":
        return _ask_phone(sess, raw)
    if state == "ask_phone":
        return _ask_address(sess, raw)
    if state == "ask_address":
        return _ask_payment(sess, raw)

    if norm in _GREETING:
        return _welcome(sess)
    if "gio hang" in norm:
        return _cart(sess)

    # 3) Đang chọn size cho một mẫu cụ thể.
    if state == "sizing":
        added = _add_to_cart(sess, raw)
        if added:
            return added

    # 4) Gõ thẳng mã hàng.
    direct = catalog.get(raw)
    if direct:
        return _focus(sess, direct["code"])

    if any(k in norm for k in ("dat hang", "chot don", "mua luon")):
        return _checkout(sess)

    return _free_answer(sess, raw)

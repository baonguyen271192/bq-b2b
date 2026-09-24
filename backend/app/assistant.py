"""Trợ lý đại lý (RAG-style) — trả lời câu hỏi dựa TRÊN dữ liệu thật của đại lý.

Kiến trúc tách lớp để dễ nối RAI thật sau này:
  build_context(dealer_code) -> gom "tri thức" (đơn, công nợ, tồn kho, chính sách)
  answer(dealer_code, question) -> lấy context + sinh câu trả lời

Mặc định dùng engine local (bám luật + truy xuất) nên CHẠY ĐƯỢC NGAY không cần
API ngoài. Khi có RAI: đặt biến môi trường RAI_URL, hàm _rag_answer sẽ đẩy
(context + câu hỏi) sang RAI và trả lời bằng kết quả của RAI.
"""
from __future__ import annotations
import os
import re
import unicodedata
from collections import Counter
from datetime import datetime, timedelta

from . import data, store

# --- Tài liệu chính sách (nguồn tri thức tĩnh cho RAG) ---
POLICIES = {
    "chiet_khau": (
        "Chiết khấu theo hạng đại lý áp vào giá sỉ: Đồng 0%, Bạc 3%, Vàng 5%, "
        "Kim Cương 8%. Chiết khấu tính tự động trên từng sản phẩm khi đặt hàng."
    ),
    "cong_no": (
        "Công nợ 30 ngày (hạn mức công nợ): đại lý được ghi nợ trong hạn mức, thanh "
        "toán trong 30 ngày kể từ ngày đặt. Đơn vượt hạn mức sẽ chuyển trạng thái "
        "'Chờ duyệt' để quản lý BQ phê duyệt ngoại lệ."
    ),
    "van_chuyen": (
        "BQ giao sỉ miễn phí tới địa chỉ kho/chi nhánh đã chọn của đại lý. Vòng đời "
        "đơn: Chờ xác nhận → Đã xác nhận → Đang đóng gói → Đang bàn giao vận chuyển → "
        "Đại lý đã nhận."
    ),
    "thanh_toan": (
        "Hình thức thanh toán sỉ: Chuyển khoản ngân hàng, Tiền mặt khi nhận (COD sỉ), "
        "hoặc Công nợ 30 ngày. Thanh toán công nợ chuyển khoản về TK công ty, kế toán "
        "đối soát theo nội dung 'BQ <mã ĐL> thanh toan cong no'."
    ),
}


def _strip(s: str) -> str:
    """Bỏ dấu + lowercase để so khớp từ khoá tiếng Việt."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().replace("đ", "d")


def build_context(dealer_code: str) -> dict:
    """Gom toàn bộ tri thức liên quan tới 1 đại lý — 'retrieval' cho RAG."""
    d = data.DEALERS.get(dealer_code.upper())
    if not d:
        return {}
    orders = store.list_orders(dealer_code.upper())
    invoices = store.credit_orders(dealer_code.upper())
    payments = store.list_payments(dealer_code.upper())
    used = data.credit_used(d)
    return {
        "dealer": {
            "code": d["code"], "name": d["name"], "tier": d["tier"],
            "credit_limit": d["credit_limit"], "credit_used": used,
            "credit_available": d["credit_limit"] - used,
            "discount_pct": int(data.TIER_DISCOUNT.get(d["tier"], 0) * 100),
        },
        "orders": orders,
        "unpaid_invoices": [i for i in invoices if not i.get("paid")],
        "payments": payments,
        "products": list(data.PRODUCTS.values()),
        "policies": POLICIES,
    }


# ---------- Engine local (chạy sẵn cho demo) ----------

def _fmt(n: int) -> str:
    return f"{n:,.0f}".replace(",", ".") + "₫"


def _norm_nl(text: str) -> str:
    """Chuẩn hoá xuống dòng do LLM đôi lúc xuất literal '\\n' (2 ký tự) thay vì newline thật."""
    if not text:
        return text
    return text.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", " ")


def _answer_credit(ctx: dict) -> dict:
    dl = ctx["dealer"]
    unpaid = ctx["unpaid_invoices"]
    lines = [
        f"Hạn mức của {dl['name']} (hạng {dl['tier']}):",
        f"• Tổng hạn mức: {_fmt(dl['credit_limit'])}",
        f"• Đã dùng: {_fmt(dl['credit_used'])}",
        f"• Còn khả dụng: {_fmt(dl['credit_available'])}",
    ]
    if unpaid:
        tot = sum(i["subtotal"] for i in unpaid)
        lines.append(f"• Đang có {len(unpaid)} hoá đơn chưa thanh toán, tổng {_fmt(tot)}.")
    return {"answer": "\n".join(lines), "chips": ["Hoá đơn nào chưa trả?", "Cách thanh toán công nợ"]}


def _due_date(created_at: str) -> datetime | None:
    """created_at dạng '15/09/2026 22:05' → ngày tới hạn = +30 ngày."""
    try:
        d = datetime.strptime(created_at.split(" ")[0], "%d/%m/%Y")
        return d + timedelta(days=30)
    except Exception:
        return None


def _answer_invoices(ctx: dict) -> dict:
    unpaid = ctx["unpaid_invoices"]
    if not unpaid:
        return {"answer": "Hiện bạn không còn hoá đơn công nợ nào chưa thanh toán.",
                "chips": ["Tổng công nợ hiện tại", "Đơn nào đang giao?"]}
    tot = sum(i["subtotal"] for i in unpaid)
    lines = [f"Có {len(unpaid)} hoá đơn chưa thanh toán (tổng {_fmt(tot)}):"]
    for i in unpaid:
        due = _due_date(i["created_at"])
        due_s = f", hạn {due.strftime('%d/%m/%Y')}" if due else ""
        lines.append(f"• Đơn {i['id']} — {_fmt(i['subtotal'])} (đặt {i['created_at'].split(' ')[0]}{due_s})")
    return {"answer": "\n".join(lines), "chips": ["Hạn thanh toán gần nhất", "Cách thanh toán công nợ"]}


def _answer_due(ctx: dict) -> dict:
    unpaid = ctx["unpaid_invoices"]
    dues = [(i, _due_date(i["created_at"])) for i in unpaid]
    dues = [(i, d) for i, d in dues if d]
    if not dues:
        return {"answer": "Hiện bạn không có công nợ nào tới hạn.", "chips": ["Tổng công nợ hiện tại"]}
    i, d = min(dues, key=lambda x: x[1])
    days = (d - datetime.now()).days
    when = "đã QUÁ HẠN" if days < 0 else (f"còn {days} ngày" if days > 0 else "hết hạn HÔM NAY")
    return {"answer": f"Hạn thanh toán gần nhất: **{d.strftime('%d/%m/%Y')}** ({when}) — đơn {i['id']}, {_fmt(i['subtotal'])}.\n"
                      f"Tổng cộng đang có {len(dues)} hoá đơn công nợ chưa tất toán.",
            "chips": ["Hoá đơn nào chưa trả?", "Cách thanh toán công nợ"]}


def _order_line(o: dict) -> str:
    return f"• {o['id']} — {o['status']} — {_fmt(o['subtotal'])}"


def _order_detail(o: dict) -> dict:
    pairs = sum(it["qty_total"] for it in o["items"])
    return {"answer": f"Đơn {o['id']}: trạng thái **{o['status']}** — {len(o['items'])} mẫu / {pairs} đôi, "
                      f"tổng {_fmt(o['subtotal'])}, thanh toán {o['payment']} (đặt {o['created_at']}).",
            "chips": ["Đơn nào đang giao?", "Tổng công nợ hiện tại"]}


# Bộ lọc trạng thái theo câu hỏi → (nhãn, các chuỗi con khớp status CÒN DẤU).
# Dùng chuỗi có dấu để tránh nhầm khi bỏ dấu (vd 'chuyển'⊃'huy').
def _status_filter(s: str):
    if "dang giao" in s or "van chuyen" in s or "ship" in s:
        return ("đang giao", ["bàn giao"])
    if "dong goi" in s:
        return ("đang đóng gói", ["đóng gói"])
    if "cho duyet" in s or "can duyet" in s or "duyet" in s:
        return ("chờ duyệt", ["Chờ duyệt", "duyệt"])
    if "cho xac nhan" in s:
        return ("chờ xác nhận", ["Chờ xác nhận"])
    if "da xac nhan" in s:
        return ("đã xác nhận", ["Đã xác nhận"])
    if "da giao" in s or "da nhan" in s or "hoan thanh" in s or "giao xong" in s or "giao thanh cong" in s:
        return ("đã giao", ["đã nhận"])
    if "huy" in s or "tu choi" in s:
        return ("đã huỷ / từ chối", ["huỷ", "từ chối"])
    return None


def _answer_order(ctx: dict, q: str) -> dict:
    s = _strip(q)
    orders = ctx["orders"]
    # 1) mã đơn cụ thể
    m = re.search(r"bq\s*\d+", s)
    if m:
        oid = m.group(0).replace(" ", "").upper()
        o = next((x for x in orders if x["id"].upper() == oid), None)
        if not o:
            return {"answer": f"Mình không tìm thấy đơn {oid} của bạn.", "chips": ["Liệt kê đơn gần đây"]}
        return _order_detail(o)
    if not orders:
        return {"answer": "Bạn chưa có đơn hàng nào.", "chips": ["Xem sản phẩm bán chạy"]}
    # 2) đơn mới nhất
    if any(k in s for k in ["moi nhat", "gan nhat", "cuoi cung", "vua dat"]):
        return _order_detail(orders[0])
    # 3) đếm / thống kê
    if any(k in s for k in ["bao nhieu", "may don", "tong so", "dem don", "so luong don"]):
        c = Counter(o["status"] for o in orders)
        lines = [f"Bạn đang có tổng **{len(orders)}** đơn:"]
        lines += [f"• {st}: {n} đơn" for st, n in c.items()]
        return {"answer": "\n".join(lines), "chips": ["Đơn nào đang giao?", "Đơn nào đã giao?"]}
    # 4) lọc theo trạng thái
    f = _status_filter(s)
    if f:
        label, subs = f
        matched = [o for o in orders if any(sub in o["status"] for sub in subs)]
        if not matched:
            return {"answer": f"Hiện không có đơn nào ở trạng thái {label}.",
                    "chips": ["Liệt kê đơn gần đây", "Tổng công nợ hiện tại"]}
        lines = [f"Đơn {label} ({len(matched)}):"] + [_order_line(o) for o in matched]
        return {"answer": "\n".join(lines), "chips": ["Đơn mới nhất", "Tổng công nợ hiện tại"]}
    # 5) mặc định: liệt kê gần đây
    lines = ["Các đơn gần đây:"] + [_order_line(o) for o in orders[:6]]
    return {"answer": "\n".join(lines), "chips": ["Đơn nào đang giao?", "Đơn nào đã giao?"]}


def _answer_discount(ctx: dict) -> dict:
    dl = ctx["dealer"]
    return {"answer": f"{ctx['policies']['chiet_khau']}\n\nBạn đang ở hạng **{dl['tier']}** → được"
                      f"chiết khấu **{dl['discount_pct']}%** trên giá sỉ, áp tự động khi đặt hàng.",
            "chips": ["Sản phẩm nào còn nhiều hàng?", "Tổng công nợ hiện tại"]}


def _match_category(s: str):
    if any(k in s for k in ["tre em", "be gai", "be trai", "tre con", "cho be"]):
        return "Trẻ Em"
    if "giay nam" in s or "cho nam" in s or " nam " in f" {s} " or s.endswith(" nam") or "sandal nam" in s:
        return "Giày Nam"
    if "giay nu" in s or "cho nu" in s or " nu " in f" {s} " or s.endswith(" nu"):
        return "Giày Nữ"
    return None


# Từ MÀU trong câu (bỏ dấu) -> khớp với field 'colors' THẬT của catalog (không phải mọi
# mẫu đều có dữ liệu màu — mẫu chưa có sẽ đơn giản không khớp màu nào, không bịa).
_COLOR_WORDS = ("den", "nau", "kem", "xam", "trang", "bo", "xanh", "do", "hong",
                "bac", "vang", "cam", "tim", "reu", "dong", "chi")
_COLOR_LABEL = {"den": "đen", "nau": "nâu", "kem": "kem", "xam": "xám", "trang": "trắng",
                "bo": "bò", "xanh": "xanh", "do": "đỏ", "hong": "hồng", "bac": "bạc",
                "vang": "vàng", "cam": "cam", "tim": "tím", "reu": "rêu", "dong": "đồng",
                "chi": "chì"}


def _match_color(s: str) -> str | None:
    """Tìm từ màu trong câu hỏi (khớp CẢ TỪ, tránh đụng độ chữ ngắn)."""
    toks = set(s.split())
    for w in _COLOR_WORDS:
        if w in toks:
            return w
    return None


def _color_matches(product_colors: list, color_word: str) -> bool:
    return any(color_word in _strip(c) for c in (product_colors or []))


def _product_card(p: dict, d: dict) -> dict:
    return {"code": p["code"], "name": p["name"], "image": p["image"],
            "images": p.get("images") or [p["image"]],   # cả gallery để xem ảnh chi tiết
            "price": data.dealer_price(p, d), "sizes": p["sizes"]}


def _product_cards_for(ctx: dict, q: str) -> list:
    """Thẻ sản phẩm (kèm ẢNH) để đính vào câu trả lời — kể cả khi dùng Gemini.
    Chỉ đính khi câu hỏi liên quan sản phẩm/tồn kho/giá/size."""
    s = _strip(q)
    d = data.DEALERS.get(ctx["dealer"]["code"])
    valid = {p["code"]: p for p in ctx["products"]}
    # Chỉ đính thẻ khi có TÍN HIỆU SẢN PHẨM rõ ràng — KHÔNG dump toàn bộ cho câu mơ hồ
    # ('công nợ bao nhiêu' cũng chứa 'bao nhieu' nhưng KHÔNG phải hỏi sản phẩm).
    # 1) Mã SKU (có chữ số) → 1 mẫu.  2) Danh mục (nam/nữ/trẻ em) → cả nhóm.  3) Khớp tên.
    #    4) Ý duyệt danh sách chung ('sản phẩm/mẫu nào/còn hàng…') → toàn bộ.  Không có → [].
    toks = set(re.findall(r"[a-z0-9]+", s))
    code_hit = next((p for c, p in valid.items()
                     if any(ch.isdigit() for ch in c) and c.lower() in toks), None)
    cat = _match_category(s)
    byname = _match_products_by_name(s, limit=1)
    list_intent = any(k in s for k in (
        "san pham", "mau nao", "co gi", "danh sach", "con hang", "cac mau", "co nhung",
        "nhung mau", "hien co", "dang co", "list", "ban chay", "ton kho", "xem mau"))
    if code_hit:
        targets = [code_hit]
    elif cat:
        targets = [p for p in ctx["products"] if p["category"] == cat]
    elif byname and byname[0] in valid:
        targets = [valid[byname[0]]]
    elif list_intent:
        targets = list(ctx["products"])
    else:
        return []
    # Có ý màu (và không phải đang khoá đúng 1 mã SKU) -> lọc THÊM (AND). KHÔNG fallback
    # về danh sách chưa lọc khi rỗng — thà không đính thẻ nào còn hơn đính nhầm màu khác.
    color = _match_color(s)
    if color and not code_hit:
        targets = [p for p in targets if _color_matches(p.get("colors"), color)]
    return [_product_card(p, d) for p in targets]


def _answer_stock(ctx: dict, q: str) -> dict:
    s = _strip(q)
    d = data.DEALERS.get(ctx["dealer"]["code"])
    prods = ctx["products"]
    valid = {p["code"]: p for p in prods}
    # Mã SKU (có số) → 1 mẫu.  DANH MỤC → cả nhóm (ưu tiên hơn đoán tên để câu duyệt
    # danh sách không bị 1 mẫu collision cướp).  Cuối cùng mới khớp tên đặc trưng.
    toks = set(re.findall(r"[a-z0-9]+", s))
    code_hit = next((p for c, p in valid.items()
                     if any(ch.isdigit() for ch in c) and c.lower() in toks), None)
    cat = _match_category(s)
    color = _match_color(s)
    if code_hit:
        targets, title = [code_hit], f"Tồn kho {code_hit['name']}:"
    elif cat:
        targets, title = [p for p in prods if p["category"] == cat], f"Sản phẩm {cat} còn hàng ({{n}} mẫu):"
    else:
        byname = _match_products_by_name(s, limit=1)
        if byname and byname[0] in valid:
            targets, title = [valid[byname[0]]], f"Tồn kho {valid[byname[0]]['name']}:"
        else:
            targets, title = prods, "Các sản phẩm hiện có ({n} mẫu):"
    # Có ý màu (và KHÔNG phải đang khoá vào 1 mã SKU cụ thể) -> lọc THÊM (AND), không
    # lặng lẽ bỏ qua nếu không khớp — thà báo rõ chưa có màu đó còn hơn trả nhầm cả nhóm.
    if color and not code_hit:
        narrowed = [p for p in targets if _color_matches(p.get("colors"), color)]
        if not narrowed:
            return {"answer": f"Dạ hiện chưa có mẫu màu **{_COLOR_LABEL.get(color, color)}** phù hợp trong "
                              f"nhóm anh/chị hỏi ạ. Anh/chị xem các mẫu khác nhé.",
                    "chips": ["Các sản phẩm hiện có", "Sản phẩm nào còn hàng?"]}
        targets = narrowed
        color_label = _COLOR_LABEL.get(color, color)
        title = (f"Sản phẩm {cat} màu {color_label} còn hàng ({{n}} mẫu):" if cat
                  else f"Sản phẩm màu {color_label} còn hàng ({{n}} mẫu):")
    if not targets:
        return {"answer": "Hiện chưa có sản phẩm phù hợp.", "chips": ["Các sản phẩm hiện có"]}
    total = len(targets)
    title = title.replace("{n}", str(total))
    shown = targets[:8]
    if total > len(shown):
        title += f" (hiển thị {len(shown)}/{total}, xem đủ ở Xem chi tiết sản phẩm)"
    return {"answer": title, "cards": [_product_card(p, d) for p in shown],
            "chips": ["Chiết khấu hạng của tôi", "Đơn nào đang giao?"]}


def _answer_policy(ctx: dict, key: str) -> dict:
    return {"answer": ctx["policies"][key], "chips": ["Tổng công nợ hiện tại", "Hoá đơn nào chưa trả?"]}


# ---------- Tạo đơn bằng hội thoại ----------

# Từ khoá đặc trưng để nhận diện sản phẩm từ câu nói tự nhiên.
_PRODUCT_KW = {
    "GBW0295": ["solara", "cao got", "mui vuong", "gbw"],
    "BQE2002": ["elite", "cong so", "bqe"],
    "SDM0259": ["sandal", "quai cheo", "sdm"],
    "BQF1001": ["flame", "sneaker", "bqf"],
    "GTE0088": ["tre em", "sporty", "gte"],
}
_DEFAULT_QTY = 10  # mỗi size, nếu người dùng không nói số lượng


# Từ chung (không đặc trưng) — bỏ qua khi khớp theo TÊN để không match nhầm mọi mẫu.
_NAME_STOP = {"giay", "dep", "sandal", "nu", "nam", "tre", "em", "be", "quai", "ngang",
              "cheo", "mui", "vuong", "di", "hoc", "bq", "mau", "doi", "size", "cao", "got",
              "the", "thao", "bup", "cong", "so", "bit",
              # từ để hỏi / đệm — không mang thông tin sản phẩm (tránh 'co'↔'cô', 'nao'…)
              "co", "khong", "cho", "xem", "ban", "con", "gia", "bao", "nhieu", "nao", "gi",
              "list", "danh", "sach", "tat", "ca", "cac", "voi", "muon", "minh", "toi", "shop",
              "la", "va", "hay", "cua", "moi", "loai", "kieu", "duoc", "a", "oi", "day", "them",
              "hang", "dang", "nhung", "hien", "deu", "van", "gio", "nay", "con", "het", "cung"
              } | set(_COLOR_WORDS)


def _match_products_by_name(s: str, limit: int = 10, products=None) -> list:
    """Khớp sản phẩm theo TÊN thật (cho catalog lớn). Trả list mã, tốt nhất trước.
    Chỉ nhận token >=3 ký tự để chữ ngắn (bỏ dấu) không đụng độ tên mẫu.
    `products` = pool sản phẩm để khớp (mặc định toàn bộ catalog)."""
    q = [t for t in re.split(r"\s+", s) if len(t) >= 3 and t not in _NAME_STOP]
    if not q:
        return []
    pool = products if products is not None else list(data.PRODUCTS.values())
    scored = []
    for p in pool:
        toks = _strip(p["name"]).split()
        score = sum(1 for t in q if t in toks)
        if score:
            scored.append((score, p["code"]))
    scored.sort(key=lambda x: -x[0])
    return [c for _, c in scored[:limit]]


def _match_product(ctx: dict, s: str):
    valid = {p["code"]: p for p in ctx["products"]}
    # 0) Mã SKU gõ thẳng trong câu (vd 'sdg0141') → tin tuyệt đối. Chỉ nhận mã CÓ CHỮ SỐ
    #    để danh từ thường trùng mã chữ (SANDAL, GIAYTH…) không bị bắt nhầm.
    toks = set(re.findall(r"[a-z0-9]+", s))
    for code, p in valid.items():
        if any(ch.isdigit() for ch in code) and code.lower() in toks:
            return p
    # 1) Khớp theo TÊN thật trong catalog của ctx — token đặc trưng, đã lọc stopword.
    #    Ưu tiên hơn _PRODUCT_KW (bảng keyword curated cũ, nhiều mã đã bị xoá khỏi catalog).
    byname = _match_products_by_name(s, 1, ctx["products"])
    if byname and byname[0] in valid:
        return valid[byname[0]]
    # 2) Cứu cánh: bảng keyword cũ — CHỈ nhận khi mã vẫn còn trong catalog hiện tại.
    scores = {c: sum(1 for k in kws if k in s) for c, kws in _PRODUCT_KW.items() if c in valid}
    if scores:
        best = max(scores, key=scores.get)
        if scores[best] > 0:
            return valid[best]
    return None


def _parse_sizes(s: str) -> list[str]:
    found = set()
    # 1) dải size: 36-38
    for a, b in re.findall(r"(\d{2})\s*[-–>]\s*(\d{2})", s):
        a, b = int(a), int(b)
        if 24 <= a <= 46 and 24 <= b <= 46 and a <= b:
            for n in range(a, b + 1):
                found.add(str(n))
    # 2) bỏ dải + số lượng ('X đôi', 'mỗi size X') để không nhầm số lượng thành size
    tmp = re.sub(r"(\d{2})\s*[-–>]\s*(\d{2})", " ", s)
    tmp = re.sub(r"\d+\s*(?:doi|dep|cai)\b", " ", tmp)
    tmp = re.sub(r"m[oô]i\s*size\s*\d+", " ", tmp)
    # 3) số 2 chữ số còn lại trong khoảng size hợp lệ
    for n in re.findall(r"\d{2}", tmp):
        if 24 <= int(n) <= 46:
            found.add(n)
    return sorted(found)


def _parse_qty(s: str):
    m = re.search(r"m[oô]i\s*size\s*(\d+)", s)  # 'mỗi size X'
    if m:
        return int(m.group(1))
    m = re.search(r"(\d+)\s*(?:doi|d[eé]p|cai)\b", s)  # 'X đôi'
    if m:
        return int(m.group(1))
    return None


def _parse_order(ctx: dict, q: str) -> dict:
    s = _strip(q)
    d = data.DEALERS.get(ctx["dealer"]["code"])
    prod = _match_product(ctx, s)
    if not prod:
        names = ", ".join(p["name"] for p in ctx["products"][:5])
        return {"answer": f"Bạn muốn đặt mẫu nào? Hiện có: {names}.",
                "chips": [p["name"] for p in ctx["products"][:4]]}
    # Bỏ chính mã sản phẩm (vd 'LZ26501') khỏi chuỗi để chữ số trong mã không bị đọc thành size.
    s_size = re.sub(re.escape(prod["code"].lower()), " ", s)
    sizes = _parse_sizes(s_size)
    av = [sz for sz, n in prod["sizes"].items() if n > 0]   # size ĐANG CÒN HÀNG của mẫu này
    if not sizes:
        avail = ", ".join(f"size {sz}" for sz in av)
        ex = f"{av[0]}-{av[2]}" if len(av) >= 3 else (f"{av[0]}-{av[-1]}" if len(av) >= 2 else (av[0] if av else "39"))
        return {"answer": f"Bạn muốn đặt {prod['name']} size nào? Còn hàng: {avail}.\n"
                          f"Ví dụ: “đặt {prod['name']} size {ex}, mỗi size 10 đôi”.",
                "cards": [_product_card(prod, d)],
                "chips": [f"{prod['name']} size {ex}"] + ([f"{prod['name']} size {av[0]}"] if av else [])}
    qty = _parse_qty(s) or _DEFAULT_QTY
    used_default = _parse_qty(s) is None

    # Dựng dòng đơn, cap theo tồn kho. Tách rõ: 'không có size cho mẫu' vs 'hết hàng'.
    price = data.dealer_price(prod, d)
    picked, sold_out, not_avail = {}, [], []
    for sz in sizes:
        if sz not in prod["sizes"]:
            not_avail.append(sz)
        elif prod["sizes"][sz] <= 0:
            sold_out.append(sz)
        else:
            picked[sz] = min(qty, prod["sizes"][sz])
    if not picked:
        reasons = []
        if not_avail:
            reasons.append(f"mẫu này không có size {', '.join(not_avail)}")
        if sold_out:
            reasons.append(f"đã hết size {', '.join(sold_out)}")
        avail = ", ".join(f"size {sz}" for sz in av)
        return {"answer": f"Rất tiếc, {' và '.join(reasons) or 'không đặt được size bạn chọn'}. "
                          f"{prod['name']} còn: {avail}. Bạn chọn size khác nhé.",
                "cards": [_product_card(prod, d)],
                "chips": [f"Tồn kho {prod['name']}"]}

    total_pairs = sum(picked.values())
    subtotal = total_pairs * price
    line = f"{prod['name']} — " + ", ".join(f"size {sz}×{q}" for sz, q in picked.items())
    notes = []
    if used_default:
        notes.append(f"(mặc định {_DEFAULT_QTY} đôi/size — nhắn lại nếu bạn muốn đổi số lượng)")
    if not_avail:
        notes.append(f"mẫu này không có size: {', '.join(not_avail)}")
    if sold_out:
        notes.append(f"đã bỏ size hết hàng: {', '.join(sold_out)}")
    # cap theo tồn
    capped = [sz for sz in picked if picked[sz] < qty]
    if capped and not used_default:
        notes.append(f"một số size chỉ còn ít hơn {qty}, đã lấy tối đa tồn")

    msg = (f"Mình đã dựng đơn nháp:\n• {line}\n"
           f"Tổng: {total_pairs} đôi × {_fmt(price)} = **{_fmt(subtotal)}**")
    if notes:
        msg += "\n" + " · ".join(notes)
    msg += "\n\nBạn kiểm tra rồi bấm **Xác nhận tạo đơn** nhé."
    return {
        "answer": msg,
        "chips": [],
        "action": {
            "type": "create_order",
            "lines": [{"code": prod["code"], "name": prod["name"], "image": prod["image"],
                       "unit_price": price, "sizes": picked}],
            "subtotal": subtotal, "total_pairs": total_pairs,
        },
    }


def _is_create_intent(s: str) -> bool:
    verbs = ["dat ", "dat mua", "dat don", "lay ", "mua ", "nhap ", "order", "can mua",
             "cho toi", "cho minh", "cho anh", "cho chi", "muon lay", "muon dat", "len don"]
    has_verb = any(v in f" {s} " for v in verbs)
    has_target = _parse_sizes(s) or re.search(r"\d+\s*doi", s) or any(
        k in s for kws in _PRODUCT_KW.values() for k in kws)
    return bool(has_verb and has_target)


def _local_answer(ctx: dict, q: str) -> dict:
    s = _strip(q)
    invoice_kw = ["hoa don", "chua tra", "chua thanh toan", "sap toi han", "sap den han", "no nao"]
    stock_kw = ["ton kho", "con hang", "con size", "size nao", "con nhieu", "het hang", "san pham", "size", "mau nao", "ban chay"]
    order_kw = ["don hang", "trang thai", "dang giao", "toi dau", "liet ke don", "cac don", "don gan day",
                "don nao", "don moi", "don cu", "may don", "bao nhieu don", "cho duyet", "cho xac nhan",
                "da giao", "da nhan", "da xac nhan", "dong goi", "bi huy", "don da huy", "don huy",
                "tinh trang don", "so don", "dem don"]
    # 0) Ý định TẠO ĐƠN bằng hội thoại (ưu tiên cao nhất)
    if _is_create_intent(s):
        return _parse_order(ctx, q)
    # 0b) Nói muốn đặt nhưng chưa rõ mẫu → hỏi lại mẫu
    if any(v in f" {s} " for v in ["dat hang", "dat don", "len don", "muon dat", "tao don", "dat mua", "muon mua", "dat 1 don", "dat mot don"]):
        return _parse_order(ctx, q)
    # 1) Mã đơn cụ thể (BQ1234) → chi tiết đơn
    if re.search(r"bq\s*\d+", s):
        return _answer_order(ctx, q)
    # 2) Hạn thanh toán / tới hạn công nợ (trước 'thanh toán' policy)
    if any(k in s for k in ["han thanh toan", "toi han", "den han", "han tra", "khi nao phai tra", "bao gio phai tra", "han cong no"]):
        return _answer_due(ctx)
    # 3) Hoá đơn / công nợ chưa trả (trước 'đơn' để không bị 'đơn nào' nuốt)
    if any(k in s for k in invoice_kw):
        return _answer_invoices(ctx)
    # 4) Câu hỏi về ĐƠN HÀNG (lọc trạng thái/đếm/mới nhất) — trước tồn kho & chiết khấu
    if any(k in s for k in order_kw):
        return _answer_order(ctx, q)
    # 5) Tồn kho / danh mục / sản phẩm (trước 'hạng' vì 'hàng' và 'hạng' đều = 'hang')
    # Đòi hỏi CẢ từ 'mau'/'màu' lẫn 1 từ màu cụ thể mới coi là hỏi màu SẢN PHẨM — tránh
    # đụng độ với 'vàng'/'bạc' là TÊN HẠNG đại lý (vd 'hạng vàng có ưu đãi gì').
    color_query = bool(_match_color(s)) and "mau" in s.split()
    if any(k in s for k in stock_kw) or _match_category(s) or color_query or any(k in s for k in ["con gi", "co gi", "con nhung", "co nhung mau", "danh muc", "mau nao"]):
        return _answer_stock(ctx, q)
    # 6) Hạn mức / công nợ tổng
    if any(k in s for k in ["han muc", "cong no", "kha dung", "no bao nhieu", "du no", "con bao nhieu tien"]):
        return _answer_credit(ctx)
    # 7) Chiết khấu theo hạng
    if any(k in s for k in ["chiet khau", "giam gia", "tier", "vang", "bac", "kim cuong", "xep hang", "hang cua"]):
        return _answer_discount(ctx)
    if any(k in s for k in ["thanh toan", "chuyen khoan", "tra tien"]):
        return _answer_policy(ctx, "thanh_toan")
    if any(k in s for k in ["giao hang", "van chuyen", "ship", "bao lau"]):
        return _answer_policy(ctx, "van_chuyen")
    # fallback: gợi ý phạm vi trả lời được
    return {"answer": "Mình là trợ lý đại lý BQ. Mình trả lời dựa trên dữ liệu thật của đại lý, ví dụ:\n"
                      "• Hạn mức & công nợ hiện tại\n• Trạng thái một đơn (vd: 'đơn BQ1004 tới đâu rồi?')\n"
                      "• Hoá đơn chưa thanh toán\n• Chiết khấu theo hạng\n• Tồn kho / size còn hàng",
            "chips": ["Tổng công nợ hiện tại", "Đơn nào đang giao?", "Chiết khấu hạng của tôi", "Sản phẩm nào còn hàng?"]}


# ---------- Chuẩn hoá đơn từ LLM (validate + cap tồn kho) ----------

def _finalize_action(ctx: dict, action: dict) -> dict | None:
    """LLM chỉ cần trả {type:'create_order', lines:[{code, sizes:{size:qty}}]}.
    Ở đây ta VALIDATE mã hàng có thật, cap theo tồn, và bồi tên/ảnh/giá/tổng tiền."""
    if not action or action.get("type") != "create_order":
        return None
    d = data.DEALERS.get(ctx["dealer"]["code"])
    by_code = {p["code"]: p for p in ctx["products"]}
    lines, subtotal, total_pairs = [], 0, 0
    for l in action.get("lines", []):
        p = by_code.get(str(l.get("code", "")).upper())
        if not p:
            continue
        price = data.dealer_price(p, d)
        picked = {}
        for sz, q in (l.get("sizes") or {}).items():
            stock = p["sizes"].get(str(sz), 0)
            q = int(q) if str(q).isdigit() else 0
            if stock > 0 and q > 0:
                picked[str(sz)] = min(q, stock)
        if not picked:
            continue
        pairs = sum(picked.values())
        lines.append({"code": p["code"], "name": p["name"], "image": p["image"],
                      "unit_price": price, "sizes": picked})
        subtotal += pairs * price
        total_pairs += pairs
    if not lines:
        return None
    return {"type": "create_order", "lines": lines, "subtotal": subtotal, "total_pairs": total_pairs}


# ---------- LLM: Gemini (RAG generation) ----------

def _llm_context(ctx: dict, question: str = "") -> dict:
    """Đóng gói tri thức gọn cho LLM — chỉ dữ liệu thật của đại lý."""
    dl = ctx["dealer"]
    orders = [{"id": o["id"], "status": o["status"], "subtotal": o["subtotal"],
               "created_at": o["created_at"], "payment": o["payment"],
               "items": [{"name": it["name"], "sizes": it["sizes"]} for it in o["items"]]}
              for o in ctx["orders"][:10]]
    invoices = []
    for i in ctx["unpaid_invoices"]:
        due = _due_date(i["created_at"])
        invoices.append({"id": i["id"], "subtotal": i["subtotal"],
                         "due": due.strftime("%d/%m/%Y") if due else None})
    # Gọn + cap để không vượt giới hạn payload LLM (catalog có ~258 sp). Nếu câu hỏi có
    # tín hiệu danh mục/màu rõ, LỌC TRƯỚC theo đó rồi mới cắt 45 — để AI thấy đúng nhóm
    # khách hỏi, không chỉ 45 mẫu đầu catalog theo thứ tự cố định.
    s = _strip(question)
    pool = ctx["products"]
    cat = _match_category(s)
    if cat:
        pool = [p for p in pool if p["category"] == cat] or pool
    color = _match_color(s)
    if color:
        narrowed = [p for p in pool if _color_matches(p.get("colors"), color)]
        if narrowed:
            pool = narrowed
    products = [{"code": p["code"], "name": p["name"], "category": p["category"],
                "colors": p.get("colors") or [],
                "price": data.dealer_price(data.PRODUCTS[p["code"]], data.DEALERS[dl["code"]]),
                "con_size": [s for s, n in p["sizes"].items() if n > 0]}
                for p in pool[:45]]
    return {"dealer": dl, "orders": orders, "unpaid_invoices": invoices,
            "products": products, "policies": ctx["policies"]}


_SYS_PROMPT = (
    "Bạn là trợ lý đặt hàng cho đại lý sỉ của thương hiệu giày BQ. "
    "CHỈ dùng dữ liệu trong DATA (JSON) để trả lời, TUYỆT ĐỐI không bịa số liệu/sản phẩm. "
    "Trả lời tiếng Việt, ngắn gọn, thân thiện, có thể dùng **in đậm**. "
    "Nếu đại lý muốn ĐẶT HÀNG, tạo 'action' create_order với các dòng {code, sizes:{size:qty}} "
    "(chỉ dùng mã & size có trong DATA, không vượt tồn kho 'stock'); nếu thiếu size/số lượng thì "
    "hỏi lại thay vì đoán. Nếu chỉ hỏi thông tin (công nợ, đơn, tồn kho, chiết khấu) thì trả lời, "
    "không tạo action. Nếu đại lý hỏi theo MÀU, chỉ liệt kê đúng sản phẩm có field 'colors' khớp "
    "màu đó, không đoán — mẫu nào field 'colors' rỗng nghĩa là chưa có dữ liệu màu, không tự suy "
    "diễn màu cho mẫu đó. Đưa 2-4 'chips' gợi ý câu hỏi tiếp theo khi hợp lý. "
    'CHỈ xuất JSON đúng dạng: {"answer": string, "chips"?: string[], '
    '"action"?: {"type":"create_order","lines":[{"code":string,"sizes":{size:qty}}]}}.'
)


def _groq_raw(system_prompt: str, data_obj: dict, q: str) -> dict | None:
    """Gọi Groq (OpenAI-compatible). Nhanh, free thoáng. Trả dict JSON đã parse, hoặc None."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    try:
        import json, urllib.request
        prompt = f"{system_prompt}\n\nDATA:\n{json.dumps(data_obj, ensure_ascii=False)}\n\nCâu hỏi: {q}"
        body = {"model": model, "temperature": 0.3,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}]}
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}",
                     "User-Agent": "Mozilla/5.0 (compatible; BQ-Assistant/1.0)"})
        res = None
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    res = json.loads(r.read().decode("utf-8"))
                break
            except Exception as e:
                if attempt == 1:
                    raise e
        text = res["choices"][0]["message"]["content"]
        text = re.sub(r"^```(?:json)?|```$", "", text.strip()).strip()
        return json.loads(text)
    except Exception as e:
        print(f"[assistant] Groq lỗi: {e}")
        return None


def _gemini_raw(system_prompt: str, data_obj: dict, q: str) -> dict | None:
    """LLM dùng chung: ưu tiên Groq → Gemini. Trả dict JSON đã parse, hoặc None."""
    g = _groq_raw(system_prompt, data_obj, q)
    if g is not None:
        return g
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    try:
        import json, urllib.request
        prompt = f"{system_prompt}\n\nDATA:\n{json.dumps(data_obj, ensure_ascii=False)}\n\nCâu hỏi: {q}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3,
                                 "thinkingConfig": {"thinkingBudget": 0}},  # tắt 'thinking' cho nhanh
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        res = None
        for attempt in range(2):  # 1 lần retry nếu timeout/lỗi mạng
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    res = json.loads(r.read().decode("utf-8"))
                break
            except Exception as e:
                if attempt == 1:
                    raise e
        parts = res["candidates"][0]["content"]["parts"]  # Gemini 3.x: gộp part có 'text'
        text = "".join(p["text"] for p in parts if "text" in p)
        text = re.sub(r"^```(?:json)?|```$", "", text.strip()).strip()
        return json.loads(text)
    except Exception as e:
        print(f"[assistant] Gemini lỗi: {e}")
        return None


def _gemini_answer(ctx: dict, q: str) -> dict | None:
    out = _gemini_raw(_SYS_PROMPT, _llm_context(ctx, q), q)
    if not out:
        return None
    result = {"answer": _norm_nl(out.get("answer", "")), "chips": out.get("chips", []), "engine": "ai"}
    act = _finalize_action(ctx, out.get("action"))
    if act:
        result["action"] = act
    cards = _product_cards_for(ctx, q)   # đính ảnh sản phẩm cho câu hỏi liên quan
    if cards:
        if len(cards) > 1:
            # DUYỆT DANH SÁCH: text ngắn khớp carousel (tránh AI liệt kê lệch với thẻ ảnh).
            cat = _match_category(_strip(q))
            label = cat or "Sản phẩm"
            total = len(cards)
            cards = cards[:8]
            note = (f" (hiển thị {len(cards)}/{total} mẫu — xem đủ ở **Xem chi tiết sản phẩm**)"
                    if total > len(cards) else "")
            result["answer"] = (f"Dạ danh mục **{label}** đang có **{total} mẫu** còn hàng{note}. "
                                f"Bạn xem và chọn mẫu bên dưới nhé:")
        result["cards"] = cards
    return result if result["answer"] or result.get("action") else None


# ---------- Điểm cắm RAI ----------

def _rag_answer(ctx: dict, q: str) -> dict | None:
    """Nếu cấu hình RAI_URL, đẩy context + câu hỏi sang RAI. Trả None nếu không dùng/được."""
    url = os.getenv("RAI_URL")
    if not url:
        return None
    try:
        import json, urllib.request
        payload = json.dumps({"question": q, "context": ctx}, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            res = json.loads(r.read().decode("utf-8"))
        # RAI cần trả {"answer": "...", "chips"?: [...]}
        if isinstance(res, dict) and res.get("answer"):
            return {"answer": res["answer"], "chips": res.get("chips", []), "engine": "rai"}
    except Exception:
        return None  # RAI lỗi → fallback engine local
    return None


# ---------- Trợ lý phía SALE (toàn hệ thống) ----------

def build_sale_context() -> dict:
    """Gom tri thức toàn hệ thống cho nhân viên sale/quản lý."""
    dealers, all_orders = [], []
    for d in data.DEALERS.values():
        used = data.credit_used(d)
        invs = [i for i in store.credit_orders(d["code"]) if not i.get("paid")]
        nearest = None
        dues = [_due_date(i["created_at"]) for i in invs]
        dues = [x for x in dues if x]
        if dues:
            nearest = min(dues).strftime("%d/%m/%Y")
        dealers.append({
            "code": d["code"], "name": d["name"], "tier": d["tier"],
            "credit_limit": d["credit_limit"], "credit_used": used,
            "credit_available": d["credit_limit"] - used,
            "unpaid_invoices": len(invs), "unpaid_total": sum(i["subtotal"] for i in invs),
            "nearest_due": nearest, "phone": d.get("phone"), "owner": d.get("owner"),
        })
    orders = store.list_orders(None)
    for o in orders:
        pairs = sum(it.get("qty_total", 0) for it in o["items"])
        prod = (o["items"][0]["name"] + (f" +{len(o['items'])-1} mẫu" if len(o["items"]) > 1 else "")) \
            if o["items"] else ""
        all_orders.append({"id": o["id"], "dealer_code": o["dealer_code"], "dealer_name": o["dealer_name"],
                           "status": o["status"], "subtotal": o["subtotal"], "channel": o["channel"],
                           "created_at": o["created_at"], "over_limit": o.get("over_limit"),
                           "product": prod, "pairs": pairs})
    by_status = dict(Counter(o["status"] for o in orders))
    by_channel = dict(Counter(o["channel"] for o in orders))
    # Sản phẩm bán chạy (đôi) — gộp từ items của đơn không huỷ
    prod_qty: Counter = Counter()
    for o in orders:
        st = o["status"].lower()
        if "huỷ" in st or "hủy" in st or "từ chối" in st:
            continue
        for it in o["items"]:
            prod_qty[it["name"]] += it["qty_total"]
    top_products = [{"name": n, "pairs": q} for n, q in prod_qty.most_common(8)]
    # Catalog TÓM TẮT (gọn để không vượt payload LLM) — đủ trả lời câu hỏi quanh sản phẩm.
    by_cat: dict = {}
    for p in data.PRODUCTS.values():
        c = p["category"]
        e = by_cat.setdefault(c, {"so_mau": 0, "gia_le_tu": p["retail"], "gia_le_den": p["retail"],
                                  "mau_dat_nhat": p["name"]})
        e["so_mau"] += 1
        if p["retail"] < e["gia_le_tu"]:
            e["gia_le_tu"] = p["retail"]
        if p["retail"] > e["gia_le_den"]:
            e["gia_le_den"] = p["retail"]; e["mau_dat_nhat"] = p["name"]
    low = [{"ten": p["name"], "size": sz, "ton": n}
           for p in data.PRODUCTS.values() for sz, n in p["sizes"].items() if n <= 5]
    prices = [p["retail"] for p in data.PRODUCTS.values()]
    catalog = {
        "tong_san_pham": len(data.PRODUCTS),
        "gia_le_thap_nhat": min(prices) if prices else 0,
        "gia_le_cao_nhat": max(prices) if prices else 0,
        "theo_danh_muc": by_cat,
        "sap_het_hang": low[:40],
    }
    return {
        "dealers": dealers,
        "orders": all_orders,
        "top_products": top_products,
        "catalog": catalog,
        "pending_approval": [o for o in all_orders if "duyệt" in o["status"]],
        "totals": {
            "orders": len(orders),
            "by_status": by_status, "by_channel": by_channel,
            "total_outstanding": sum(dl["unpaid_total"] for dl in dealers),
            "gmv": sum(o["subtotal"] for o in orders if "huỷ" not in o["status"] and "từ chối" not in o["status"]),
        },
    }


_SALE_SYS = (
    "Bạn là trợ lý cho nhân viên sale/quản lý của thương hiệu giày sỉ BQ. "
    "CHỈ dùng dữ liệu trong DATA (JSON toàn hệ thống: đại lý, công nợ, đơn hàng, thống kê, "
    "top_products = sản phẩm bán chạy theo đôi; catalog = danh mục sản phẩm gồm tổng số, "
    "theo_danh_muc, khoảng giá lẻ, sap_het_hang, danh_sach mẫu+giá), không bịa. "
    "Bạn giúp: tóm tắt tình hình kinh doanh & đại lý; cảnh báo công nợ quá hạn/sắp tới hạn; "
    "trả lời câu hỏi về **sản phẩm** (số lượng mẫu, theo danh mục, giá, mẫu sắp hết hàng — dùng catalog); "
    "thống kê đơn theo trạng thái/kênh; **sản phẩm bán chạy** (dùng top_products); "
    "xếp hạng đại lý theo doanh số/công nợ; và SOẠN tin nhắn "
    "(nhắc công nợ, chăm sóc, thông báo khuyến mãi) khi được yêu cầu — xưng hô lịch sự, chuyên nghiệp. "
    "Trả lời tiếng Việt, ngắn gọn, có thể dùng **in đậm**, xuống dòng bằng \\n. "
    "Số tiền định dạng có dấu chấm ngăn cách (vd 1.500.000₫). "
    'CHỈ xuất JSON: {"answer": string, "chips"?: string[]}.'
)


_CH_LABEL = {"app": "App", "web": "Web", "ai-chat": "AI Chat"}


def _sale_order_card(o: dict) -> dict:
    """Dữ liệu 1 THẺ đơn cho trợ lý sale (frontend render badge trạng thái)."""
    return {
        "id": o["id"],
        "who": o["dealer_name"],
        "channel": _CH_LABEL.get(o["channel"], o["channel"]),
        "product": o.get("product", ""),
        "pairs": o.get("pairs", 0),
        "amount": _fmt(o["subtotal"]),
        "status": o["status"],
        "over_limit": bool(o.get("over_limit")),
        "created_at": o.get("created_at", ""),
    }


def _sale_status_orders(ctx: dict, s: str) -> dict | None:
    """Câu hỏi liệt kê đơn theo TRẠNG THÁI (đang đóng gói/đang giao/đã giao/chờ duyệt…)
    → trả THẺ ĐƠN có cấu trúc, deterministic. Trả None nếu không phải ý này."""
    f = _status_filter(s)
    if not f or "don" not in f" {s} " and "đơn" not in s:
        return None
    label, subs = f
    matched = [o for o in ctx["orders"] if any(sub in o["status"] for sub in subs)]
    chips = ["Đơn nào cần duyệt?", "Đơn theo kênh bán", "Đại lý nào nợ nhiều nhất?"]
    if not matched:
        return {"answer": f"Hiện không có đơn nào ở trạng thái **{label}**.", "engine": "local", "chips": chips}
    total = sum(o["subtotal"] for o in matched)
    header = f"📦 **Đơn {label}** — {len(matched)} đơn · tổng {_fmt(total)}"
    if len(matched) > 12:
        header += f"\n(hiển thị 12/{len(matched)} đơn)"
    return {"answer": header, "orders": [_sale_order_card(o) for o in matched[:12]],
            "engine": "local", "chips": chips}


def answer_sale(question: str) -> dict:
    ctx = build_sale_context()
    # Câu hỏi liệt kê đơn theo trạng thái → local-first (chi tiết + đúng, không phụ thuộc LLM).
    stq = _sale_status_orders(ctx, _strip(question))
    if stq:
        return stq
    out = _gemini_raw(_SALE_SYS, ctx, question)
    if out and out.get("answer"):
        return {"answer": _norm_nl(out["answer"]), "chips": out.get("chips", []), "engine": "ai"}
    # ---- Fallback local: hiểu Ý câu hỏi (không chỉ trả tổng quan) ----
    s = _strip(question)
    t = ctx["totals"]
    dealers = ctx["dealers"]
    CH = {"app": "App", "web": "Web", "ai-chat": "AI Chat"}
    chips = ["Đại lý nào nợ nhiều nhất?", "Soạn tin nhắc công nợ", "Đơn theo kênh bán", "Đơn nào cần duyệt?"]
    debtors = sorted([d for d in dealers if d["credit_used"] > 0], key=lambda d: -d["credit_used"])

    def _find_dealer():
        words = set(s.split())   # khớp theo TỪ nguyên (tránh 'anh' ⊂ 'thanh')
        for d in dealers:
            toks = [x for x in _strip(d["name"]).split() if len(x) >= 3 and x not in ("dai", "cua", "hang", "npp")]
            if d["code"].lower() in words or any(x in words for x in toks):
                return d
        return None

    # 0) Lạc đề / chào hỏi → không đổ dashboard
    if any(k in s for k in ["troi", "thoi tiet", "khoe khong", "ban la ai", "ban ten", "may gio", "an com", "the nao roi"]) \
            and not any(k in s for k in ["doanh", "cong no", " no", "don", "dai ly", "san pham", "kenh", "ban chay", "duyet"]):
        return {"answer": "Chào bạn 👋 Mình là **Trợ lý Sale BQ** — giúp về doanh số, công nợ, đơn hàng, "
                          "sản phẩm và soạn tin cho đại lý. Bạn cần xem gì ạ?", "engine": "local", "chips": chips}

    # 1) Soạn tin nhắc công nợ (đúng đại lý được nêu, nếu có)
    if any(k in s for k in ["soan tin", "nhac cong no", "nhac no", "nhac thanh toan"]):
        d = _find_dealer() or (debtors[0] if debtors else None)
        if not d:
            return {"answer": "Hiện chưa có công nợ nào cần nhắc.", "engine": "local", "chips": chips}
        if d["credit_used"] <= 0:
            return {"answer": f"{d['name']} hiện không có công nợ nên chưa cần nhắc ạ.", "engine": "local", "chips": chips}
        due = d.get("nearest_due") or "sắp tới"
        msg = (f"Kính gửi {d['name']},\n"
               f"BQ xin thông báo công nợ hiện tại của Quý đại lý là {_fmt(d['credit_used'])}, "
               f"hạn thanh toán gần nhất {due}. Kính mong Quý đại lý sắp xếp thanh toán đúng hạn. "
               f"Trân trọng! — Phòng Kinh doanh BQ")
        return {"answer": f"✍️ **Tin nhắc công nợ — {d['name']}**\n\n{msg}", "engine": "local", "chips": chips}

    # 2) Đơn theo kênh bán
    if any(k in s for k in ["kenh", "channel", " app", " web"]):
        lines = ["📊 **Đơn theo kênh bán**"]
        for k, v in sorted(t["by_channel"].items(), key=lambda x: -x[1]):
            pct = round(v / max(1, t["orders"]) * 100)
            lines.append(f"• {CH.get(k, k)}: **{v}** đơn ({pct}%)")
        return {"answer": "\n".join(lines), "engine": "local", "chips": chips}

    # 3) Đại lý nào nợ nhiều nhất
    if any(k in s for k in ["no nhieu", "no nhat", "dai ly nao no", "cong no dai ly", "ai no", "no nhat"]):
        if not debtors:
            return {"answer": "Hiện chưa có đại lý nào phát sinh công nợ.", "engine": "local", "chips": chips}
        lines = ["💳 **Đại lý theo công nợ (cao → thấp)**"]
        for d in debtors:
            warn = " ⚠️ vượt hạn mức" if d["credit_used"] > d["credit_limit"] else ""
            due = f" · hạn {d['nearest_due']}" if d.get("nearest_due") else ""
            lines.append(f"• **{d['name']}** ({d['code']}): {_fmt(d['credit_used'])}{warn}{due}")
        return {"answer": "\n".join(lines), "engine": "local", "chips": chips}

    # 4) Đơn cần duyệt
    if "duyet" in s:
        pend = ctx["pending_approval"]
        if not pend:
            return {"answer": "✅ Hiện không có đơn nào chờ duyệt.", "engine": "local", "chips": chips}
        lines = [f"⚠️ **{len(pend)} đơn chờ duyệt** (vượt hạn mức):"]
        lines += [f"• {o['id']} — {o['dealer_name']} — {_fmt(o['subtotal'])}" for o in pend[:8]]
        return {"answer": "\n".join(lines), "engine": "local", "chips": chips}

    # 4b) Sản phẩm bán chạy
    if any(k in s for k in ["ban chay", "top san pham", "san pham nao ban", "hot nhat", "chay nhat"]):
        tp = ctx.get("top_products", [])
        if not tp:
            return {"answer": "Chưa có dữ liệu sản phẩm bán chạy.", "engine": "local", "chips": chips}
        lines = ["🏆 **Sản phẩm bán chạy (đôi)**"]
        lines += [f"• {p['name']}: **{p['pairs']}**" for p in tp[:8]]
        return {"answer": "\n".join(lines), "engine": "local", "chips": chips}

    cat = ctx.get("catalog", {})
    # 4c) Số sản phẩm / theo danh mục / giá
    if any(k in s for k in ["bao nhieu san pham", "bao nhieu mau", "danh muc", "loai giay",
                            "co nhung loai", "tong san pham", "khoang gia"]):
        lines = [f"👟 **Danh mục sản phẩm** — tổng **{cat.get('tong_san_pham', 0)}** mẫu"]
        for k, v in cat.get("theo_danh_muc", {}).items():
            lines.append(f"• {k}: {v['so_mau']} mẫu (giá lẻ {_fmt(v['gia_le_tu'])} – {_fmt(v['gia_le_den'])})")
        return {"answer": "\n".join(lines), "engine": "local", "chips": chips}

    # 4d) Sắp hết hàng / tồn thấp
    if any(k in s for k in ["sap het", "het hang", "ton thap", "ton kho thap", "canh bao ton"]):
        lo = cat.get("sap_het_hang", [])
        if not lo:
            return {"answer": "✅ Không có mẫu nào đang sắp hết hàng.", "engine": "local", "chips": chips}
        lines = [f"⚠️ **{len(lo)} size sắp hết / hết hàng**:"]
        lines += [f"• {x['ten']} · size {x['size']}: {'hết' if x['ton'] == 0 else str(x['ton']) + ' đôi'}"
                  for x in lo[:12]]
        return {"answer": "\n".join(lines), "engine": "local", "chips": chips}

    # 5) Mặc định: tổng quan hệ thống
    lines = [
        "📊 **Tổng quan hệ thống**",
        f"• Đơn: **{t['orders']}**",
        f"• Doanh số (GMV): **{_fmt(t['gmv'])}**",
        f"• Công nợ phải thu: **{_fmt(t['total_outstanding'])}**",
        "",
        "**Đơn theo trạng thái**",
    ]
    lines += [f"• {k}: {v}" for k, v in t["by_status"].items()]
    if ctx["pending_approval"]:
        lines += ["", f"⚠️ **{len(ctx['pending_approval'])} đơn** đang chờ duyệt."]
    return {"answer": "\n".join(lines), "engine": "local", "chips": chips}


def answer(dealer_code: str, question: str) -> dict:
    ctx = build_context(dealer_code)
    if not ctx:
        return {"answer": "Không tìm thấy thông tin đại lý.", "chips": []}
    # Ý ĐỊNH ĐẶT HÀNG có mẫu cụ thể → dựng đơn DETERMINISTIC từ toàn catalog, KHÔNG qua LLM
    # (context đưa LLM bị cap ~45/258 mẫu nên hay bịa 'không có sản phẩm' cho mẫu ngoài cap).
    s = _strip(question)
    if _is_create_intent(s) and _match_product(ctx, s):
        out = _parse_order(ctx, question)
        out["engine"] = "local"
        return out
    # Ưu tiên LLM thật (Gemini) → RAI → engine local (fallback luôn chạy được)
    for engine in (_gemini_answer, _rag_answer):
        out = engine(ctx, question)
        if out:
            return out
    out = _local_answer(ctx, question)
    out["engine"] = "local"
    return out

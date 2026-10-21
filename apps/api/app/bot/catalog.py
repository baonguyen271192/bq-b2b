"""Danh mục cho bot bán lẻ — đọc từ backend Java, không giữ bản sao.

Hệ thống cũ nhúng cả danh mục vào mã nguồn (một file 22.000 dòng sinh tự động từ
giaybq.com.vn). Hậu quả: bot bán hàng mà kho đã hết, giá lệch với app đại lý, và
mỗi lần BQ đổi hàng phải sinh lại file rồi deploy. Ở đây danh mục đến từ đúng chỗ
app đại lý đang đọc.
"""

from __future__ import annotations

from .. import bq_client
from ..assistant import match_category, strip_accents


def all_products() -> list[dict]:
    return bq_client.admin_products()


def categories() -> list[str]:
    return bq_client.categories()


def get(code: str) -> dict | None:
    target = (code or "").strip().upper()
    for p in all_products():
        if p.get("code", "").upper() == target:
            return p
    return None


def in_category(name: str, limit: int = 10) -> list[dict]:
    return [p for p in all_products() if p.get("category") == name][:limit]


# Từ không mang nghĩa sản phẩm. Thiếu danh sách này thì "shop có ship ra Hà Nội
# không" khớp trúng "giày ... nối hậu" chỉ vì chung mỗi token "noi".
_NOISE = {
    "shop", "ship", "gui", "giao", "hang", "cho", "minh", "toi", "ban", "chi",
    "anh", "khong", "nhe", "the", "nao", "bao", "nhieu", "lau", "tien", "phi",
    "duoc", "muon", "hoi", "con", "nua", "voi", "nay", "day", "lam", "sao",
    "tai", "noi", "dia", "gia", "xem", "mua", "dat",
}


def _score(query_tokens: list[str], product: dict) -> int:
    name_tokens = set(strip_accents(product["name"]).split())
    return sum(1 for t in query_tokens if t in name_tokens)


def search(text: str, limit: int = 10) -> list[dict]:
    """Tìm theo mã trước, rồi tới danh mục, cuối cùng mới tới tên.

    Khách hay gõ thẳng mã đọc được trên ảnh ("GBW0295") — khớp mã mà vẫn chạy qua
    khớp tên thì một mã cụ thể lại ra mười mẫu na ná.

    Ngưỡng khớp tên CHẶT có chủ ý: câu hỏi về chính sách ("ship ra Hà Nội không")
    không được biến thành kết quả tìm hàng. Thà trả về rỗng để lớp trên hỏi LLM,
    còn hơn dúi vào mặt khách một mẫu giày chẳng liên quan.
    """
    products = all_products()
    raw = (text or "").strip()
    if raw:
        exact = [p for p in products if p.get("code", "").upper() == raw.upper()]
        if exact:
            return exact

    norm = strip_accents(raw)
    cat = match_category(norm)
    if cat:
        return in_category(cat, limit)

    tokens = [t for t in norm.split() if len(t) >= 3 and t not in _NOISE]
    if not tokens:
        return []

    # 1 token trùng chỉ đủ khi khách gõ ngắn gọn ("sandal", "cao got").
    # Câu dài mà chỉ trúng 1 token gần như luôn là trùng ngẫu nhiên.
    need = 1 if len(tokens) <= 2 else 2
    scored = [(sc, p) for p in products if (sc := _score(tokens, p)) >= need]
    scored.sort(key=lambda x: -x[0])
    return [p for _, p in scored[:limit]]


def retail_price(p: dict) -> int:
    """Giá KHÁCH LẺ. Không bao giờ là `price` — trường đó là giá sỉ theo bậc đại lý."""
    return int(p.get("retail") or 0)


def stock(p: dict, size: str) -> int:
    return int((p.get("sizes") or {}).get(str(size), 0))


def sizes_in_stock(p: dict) -> list[str]:
    sizes = p.get("sizes") or {}
    return [s for s in sorted(sizes, key=lambda x: int(x)) if int(sizes[s]) > 0]

"""Dữ liệu mẫu cho nghiệp vụ đặt đơn sỉ Giày BQ (demo, chưa nối ERP).

Mỗi loại dữ liệu ở đây sau này thay bằng API ERP/hệ thống thật là chạy được ngay,
không phải sửa luồng nghiệp vụ trong api.py/assistant.py.
"""

# --- Bậc đại lý và chiết khấu sỉ tương ứng ---
# Chiết khấu cộng thêm trên GIÁ SỈ CƠ BẢN của sản phẩm.
TIER_DISCOUNT = {
    "Đồng": 0.00,
    "Bạc": 0.03,
    "Vàng": 0.05,
    "Kim Cương": 0.08,
}

# --- Đại lý mẫu ---
# credit_limit: tổng hạn mức công nợ; credit_used: đã dùng.
# credit_opening = công nợ đầu kỳ (từ ERP/kế toán). Demo để 0 -> công nợ thực tế
# được TÍNH ĐỘNG từ các đơn hàng trả bằng Công nợ (xem api.py). Không mock số nợ.
DEALERS = {
    "DL001": {
        "code": "DL001",
        "name": "Đại lý Minh Anh",
        "tier": "Vàng",
        "credit_limit": 50_000_000,
        "credit_opening": 0,
        "owner": "Nguyễn Văn Minh",
        "phone": "0901 234 567",
        "email": "minhanh@giaybq.vn",
        "invoice_address": "456 Lê Lợi, Q.1, TP.HCM",
    },
    "DL002": {
        "code": "DL002",
        "name": "Cửa hàng Hồng Phúc",
        "tier": "Bạc",
        "credit_limit": 20_000_000,
        "credit_opening": 0,
        "owner": "Trần Hồng Phúc",
        "phone": "0912 888 456",
        "email": "hongphuc@giaybq.vn",
        "invoice_address": "12 Trần Hưng Đạo, Q.5, TP.HCM",
    },
    "DL003": {
        "code": "DL003",
        "name": "NPP Thành Đạt",
        "tier": "Kim Cương",
        "credit_limit": 80_000_000,
        "credit_opening": 0,
        "owner": "Lê Thành Đạt",
        "phone": "0938 555 123",
        "email": "thanhdat@giaybq.vn",
        "invoice_address": "88 Cách Mạng Tháng 8, Q.3, TP.HCM",
    },
}

# --- Danh mục sản phẩm THẬT (258 sp) — cào từ giaybq.com.vn, sinh trong catalog.py ---
from .catalog import PRODUCTS, CATEGORIES  # noqa: E402


def products_by_category(cat: str):
    return [p for p in PRODUCTS.values() if p["category"] == cat]


def dealer_price(product: dict, dealer: dict) -> int:
    """Giá sỉ cuối cùng cho 1 đại lý = giá sỉ cơ bản - chiết khấu theo bậc."""
    disc = TIER_DISCOUNT.get(dealer["tier"], 0.0)
    return round(product["wholesale"] * (1 - disc))


def credit_used(dealer: dict) -> int:
    """Công nợ đã dùng = đầu kỳ + tổng đơn công nợ thực tế (từ store)."""
    from . import store  # import cục bộ tránh vòng lặp
    return dealer.get("credit_opening", 0) + store.outstanding_credit(dealer["code"])


def credit_available(dealer: dict) -> int:
    return dealer["credit_limit"] - credit_used(dealer)


def vnd(n: int) -> str:
    """Định dạng tiền VND: 450000 -> '450.000₫'."""
    return f"{n:,.0f}".replace(",", ".") + "₫"

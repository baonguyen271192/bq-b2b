"""Hình dạng dữ liệu đi qua port.

Dùng TypedDict (không phải dataclass) vì toàn bộ code hiện có thao tác trên dict và
FastAPI serialize dict trực tiếp — tránh một lớp chuyển đổi vô ích. Các khoá ở đây
PHẢI khớp với `packages/types` của frontend; hai nơi lệch nhau là lỗi.
"""

from __future__ import annotations

from typing import Dict, List, Optional

try:  # TypedDict chuyển sang typing_extensions cho bản Python cũ
    from typing import TypedDict
except ImportError:  # pragma: no cover
    from typing_extensions import TypedDict  # type: ignore


class ProductDict(TypedDict, total=False):
    code: str
    name: str
    category: str
    retail: int
    wholesale: int
    price: int  # giá sau chiết khấu bậc của đại lý đang xem
    sizes: Dict[str, int]  # size -> tồn kho (đôi)
    image: str
    images: List[str]
    colors: List[str]


class DealerDict(TypedDict, total=False):
    code: str
    name: str
    tier: str
    credit_limit: int
    credit_opening: int
    owner: str
    phone: str
    email: str
    invoice_address: str


class OrderItemDict(TypedDict):
    code: str
    name: str
    sizes: Dict[str, int]
    unit_price: int
    qty_total: int
    line_total: int


class OrderDict(TypedDict, total=False):
    id: str
    dealer_code: str
    dealer_name: str
    items: List[OrderItemDict]
    subtotal: int
    delivery: str
    payment: str
    status: str
    channel: str
    over_limit: bool
    created_at: str
    approver: Optional[str]
    approve_note: Optional[str]
    paid: bool


class PaymentDict(TypedDict):
    id: str
    dealer_code: str
    order_id: Optional[str]
    amount: int
    method: str
    created_at: str

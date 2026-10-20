"""Ánh xạ giữa entity SAP B1 và model của BQ.

Đây là nơi TẬP TRUNG mọi giả định về cấu hình B1 của BQ. Mục tiêu thiết kế: khi
bản cài thật khác với giả định, chỉ phải sửa FILE NÀY — không lan ra api.py, FE hay
mobile.
"""

from __future__ import annotations

import os
import re
from typing import Dict, Iterable, List, Optional, Tuple

from app.ports.models import DealerDict, OrderDict, ProductDict
from .service_layer import NeedsMapping

# --- Bảng size: điểm rủi ro số 1 -------------------------------------------------
#
# B1 không có size-matrix gốc. Giả định MẶC ĐỊNH ở đây: mỗi size là một ItemCode
# dạng "<mã gốc>-<size>" (vd GBW0295-35). Đổi bằng biến môi trường, không sửa code:
#
#   SAPB1_SKU_PATTERN='^(?P<base>[A-Z0-9]+)-(?P<size>\d{2})$'
#
# Nếu BQ dùng cách khác (UDF U_Size trên Items, add-on matrix, hay ItemCode phẳng
# không mã hoá size), hàm `parse_item_code` phải viết lại cho đúng — và CHỈ hàm này.
_SKU_PATTERN = re.compile(
    os.getenv("SAPB1_SKU_PATTERN", r"^(?P<base>[A-Za-z0-9]+)-(?P<size>\d{2})$")
)


def parse_item_code(item_code: str) -> Tuple[str, Optional[str]]:
    """Tách ItemCode của B1 thành (mã sản phẩm gốc, size).

    Trả size=None khi mã không khớp mẫu — gọi là "mã phẳng". Caller phải quyết định
    coi đó là sản phẩm không có size hay là lỗi cấu hình, chứ hàm này không đoán hộ.
    """
    m = _SKU_PATTERN.match(item_code)
    if not m:
        return item_code, None
    return m.group("base"), m.group("size")


def group_items_to_products(
    rows: Iterable[dict], warehouse_code: Optional[str] = None
) -> List[ProductDict]:
    """Gom nhiều dòng Items của B1 thành sản phẩm BQ có bảng size.

    `warehouse_code` lọc tồn theo một kho; None = cộng tất cả kho. Bán sỉ thường
    xuất từ một kho tổng, nên để None dễ ra số tồn LỚN HƠN thực tế bán được.
    """
    grouped: Dict[str, ProductDict] = {}

    for row in rows:
        item_code = row.get("ItemCode", "")
        base, size = parse_item_code(item_code)

        product = grouped.setdefault(
            base,
            {
                "code": base,
                # Tên của dòng đầu tiên gặp được; thực tế nên lấy từ item cha nếu
                # B1 của BQ có cấu trúc cha-con.
                "name": row.get("ItemName", base),
                "category": str(row.get("ItemsGroupCode", "")),
                "sizes": {},
                "retail": 0,
                "wholesale": 0,
                "image": "",
            },
        )

        if size is not None:
            product["sizes"][size] = _in_stock(row, warehouse_code)

    return list(grouped.values())


def _in_stock(item_row: dict, warehouse_code: Optional[str]) -> int:
    """Tồn khả dụng từ ItemWarehouseInfoCollection.

    Dùng InStock - IsCommited (đã cam kết cho đơn khác) - ... tuỳ chính sách BQ.
    [Unverified] Chính sách "đôi nào được coi là bán được" là quyết định NGHIỆP VỤ
    của BQ, không phải kỹ thuật — phải hỏi trước khi chốt công thức.
    """
    warehouses = item_row.get("ItemWarehouseInfoCollection") or []
    total = 0
    for wh in warehouses:
        if warehouse_code and wh.get("WarehouseCode") != warehouse_code:
            continue
        in_stock = wh.get("InStock") or 0
        committed = wh.get("Committed") or 0
        total += int(in_stock) - int(committed)
    return max(total, 0)


# --- Đại lý ----------------------------------------------------------------------

def business_partner_to_dealer(bp: dict) -> DealerDict:
    """BusinessPartner (cCustomer) -> đại lý BQ.

    `CurrentAccountBalance` là công nợ hiện tại do ERP tính — KHÔNG tự cộng lại từ
    đơn hàng như adapter demo, vì ERP mới là nguồn sự thật về kế toán.
    """
    return {
        "code": bp.get("CardCode", ""),
        "name": bp.get("CardName", ""),
        "tier": price_list_to_tier(bp.get("PriceListNum")),
        "credit_limit": int(bp.get("CreditLimit") or 0),
        "credit_opening": int(bp.get("CurrentAccountBalance") or 0),
        "owner": bp.get("ContactPerson") or "",
        "phone": bp.get("Phone1") or "",
        "email": bp.get("EmailAddress") or "",
        "invoice_address": bp.get("Address") or "",
    }


def price_list_to_tier(price_list_num: Optional[int]) -> str:
    """Số bảng giá B1 -> tên bậc đại lý của BQ (Đồng/Bạc/Vàng/Kim Cương).

    Ánh xạ nằm ở biến môi trường vì nó là cấu hình vận hành, không phải code:
        SAPB1_TIER_BY_PRICELIST="1:Đồng,2:Bạc,3:Vàng,4:Kim Cương"
    """
    raw = os.getenv("SAPB1_TIER_BY_PRICELIST", "")
    if not raw:
        raise NeedsMapping(
            "Chưa biết bảng giá nào của B1 ứng với bậc nào của BQ. "
            "Đặt SAPB1_TIER_BY_PRICELIST, vd '1:Đồng,2:Bạc,3:Vàng,4:Kim Cương'."
        )
    table = dict(pair.split(":", 1) for pair in raw.split(",") if ":" in pair)
    return table.get(str(price_list_num), "Đồng")


# --- Đơn hàng --------------------------------------------------------------------

def order_to_b1_payload(
    dealer: DealerDict, items: List[dict], warehouse_code: str, comments: str = ""
) -> dict:
    """Đơn BQ -> payload `POST /Orders` của Service Layer.

    Mỗi (mã sản phẩm, size) trong bảng size thành MỘT DocumentLine riêng, vì B1
    đếm số lượng theo ItemCode chứ không theo lưới size.
    """
    lines = []
    for item in items:
        for size, qty in (item.get("sizes") or {}).items():
            if qty <= 0:
                continue
            lines.append(
                {
                    "ItemCode": to_item_code(item["code"], size),
                    "Quantity": qty,
                    "UnitPrice": item["unit_price"],
                    "WarehouseCode": warehouse_code,
                }
            )

    if not lines:
        raise ValueError("Đơn không có dòng nào có số lượng > 0.")

    return {
        "CardCode": dealer["code"],
        "Comments": comments[:254],  # B1 giới hạn độ dài trường Comments
        "DocumentLines": lines,
    }


def to_item_code(base_code: str, size: str) -> str:
    """Nghịch đảo của `parse_item_code`. Phải đổi kèm khi đổi quy tắc mã."""
    return f"{base_code}-{size}"


def b1_order_to_order(doc: dict) -> OrderDict:
    """Sales Order của B1 -> đơn BQ (gom các DocumentLine ngược lại thành bảng size)."""
    raise NeedsMapping(
        "Cần biết BQ lưu trạng thái đơn ở đâu trong B1 (DocStatus chuẩn, U_* UDF, "
        "hay bảng phụ) mới ánh xạ ngược được vòng đời 'Chờ xác nhận -> ... -> Đã nhận'."
    )

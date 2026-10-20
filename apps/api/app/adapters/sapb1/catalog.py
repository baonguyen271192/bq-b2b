"""Danh mục từ SAP B1 Service Layer."""

from __future__ import annotations

import os
from typing import List, Optional

from app.ports.models import DealerDict, ProductDict
from . import mapping
from .service_layer import NeedsMapping, ServiceLayerClient


class SapB1Catalog:
    def __init__(self, client: ServiceLayerClient):
        self._client = client
        # Kho xuất hàng sỉ. Để trống = cộng tồn mọi kho (dễ ra số lớn hơn thực bán).
        self._warehouse = os.getenv("SAPB1_WAREHOUSE") or None

    def categories(self) -> List[str]:
        rows = self._client.list("/ItemGroups?$select=Number,GroupName")
        return [r["GroupName"] for r in rows if r.get("GroupName")]

    def products(self, category: Optional[str] = None) -> List[ProductDict]:
        # $select giới hạn trường để không kéo về cả trăm cột của OITM.
        select = "ItemCode,ItemName,ItemsGroupCode,ItemWarehouseInfoCollection"
        path = f"/Items?$select={select}&$filter=SalesItem eq 'tYES'"
        if category:
            path += f" and ItemsGroupCode eq {int(category)}"
        return mapping.group_items_to_products(self._client.iter_all(path), self._warehouse)

    def product(self, code: str) -> Optional[ProductDict]:
        # Một "sản phẩm BQ" = nhiều ItemCode (mỗi size một mã) → lọc theo tiền tố.
        select = "ItemCode,ItemName,ItemsGroupCode,ItemWarehouseInfoCollection"
        path = f"/Items?$select={select}&$filter=startswith(ItemCode,'{code}')"
        products = mapping.group_items_to_products(self._client.iter_all(path), self._warehouse)
        return products[0] if products else None

    def dealer_price(self, product: ProductDict, dealer: DealerDict) -> int:
        raise NeedsMapping(
            "Giá sỉ theo đại lý: cần chốt lấy từ PriceLists gán cho BusinessPartner, "
            "hay SpecialPrices theo cặp khách–hàng, hay UDF riêng của BQ. "
            "Xem SAPB1_TIER_BY_PRICELIST trong mapping.py."
        )

    def set_stock(self, code: str, sizes: dict) -> Optional[ProductDict]:
        # Tồn kho do ERP làm chủ. Sửa tồn phải đi qua chứng từ kho (Goods Receipt /
        # Inventory Posting) chứ không ghi đè trường InStock.
        raise PermissionError(
            "Không sửa tồn kho từ BQ khi nguồn là SAP B1 — tồn do ERP làm chủ."
        )

    # --- CRUD quản trị: danh mục do ERP làm chủ ---
    _OWNED_BY_ERP = (
        "Danh mục sản phẩm do SAP B1 làm chủ — tạo/sửa/xoá mặt hàng thực hiện trong "
        "ERP, không từ app bán hàng."
    )

    def add(self, product: ProductDict) -> ProductDict:
        raise PermissionError(self._OWNED_BY_ERP)

    def upsert(self, code: str, patch: dict) -> Optional[ProductDict]:
        raise PermissionError(self._OWNED_BY_ERP)

    def remove(self, code: str) -> bool:
        raise PermissionError(self._OWNED_BY_ERP)

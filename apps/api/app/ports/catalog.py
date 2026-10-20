"""Port danh mục: sản phẩm, nhóm hàng, tồn kho theo size, giá theo đại lý."""

from __future__ import annotations

from typing import List, Optional, Protocol

from .models import DealerDict, ProductDict


class CatalogPort(Protocol):
    def categories(self) -> List[str]:
        """Danh sách nhóm hàng (B1: ItemGroups)."""
        ...

    def products(self, category: Optional[str] = None) -> List[ProductDict]:
        """Sản phẩm kèm tồn theo size. KHÔNG áp giá đại lý ở đây."""
        ...

    def product(self, code: str) -> Optional[ProductDict]:
        ...

    def dealer_price(self, product: ProductDict, dealer: DealerDict) -> int:
        """Giá sỉ cuối cùng cho một đại lý.

        Demo: giá sỉ cơ bản trừ chiết khấu theo bậc.
        SAP B1: lấy từ bảng giá gán cho BusinessPartner, có thể bị SpecialPrices
        (giá riêng theo khách/mặt hàng) ghi đè — nên phép tính PHẢI nằm trong adapter,
        không nằm trong api.py.
        """
        ...

    def set_stock(self, code: str, sizes: dict) -> Optional[ProductDict]:
        """Cập nhật tồn (chỉ demo/admin). Với B1, tồn do ERP làm chủ → adapter B1
        nên từ chối thao tác này thay vì ghi ngược vào ERP."""
        ...

    # --- CRUD quản trị ---
    # Chỉ có nghĩa khi BQ làm chủ danh mục. Khi nguồn là ERP, adapter phải TỪ CHỐI
    # (PermissionError) thay vì ghi ngược — danh mục do ERP làm chủ.
    def add(self, product: ProductDict) -> ProductDict:
        ...

    def upsert(self, code: str, patch: dict) -> Optional[ProductDict]:
        ...

    def remove(self, code: str) -> bool:
        ...

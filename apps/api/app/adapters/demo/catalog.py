"""Danh mục từ dữ liệu mẫu trong repo."""

from __future__ import annotations

from typing import List, Optional

from app import data
from app.ports.models import DealerDict, ProductDict


class DemoCatalog:
    def categories(self) -> List[str]:
        return list(data.CATEGORIES)

    def products(self, category: Optional[str] = None) -> List[ProductDict]:
        if category:
            return data.products_by_category(category)
        return list(data.PRODUCTS.values())

    def product(self, code: str) -> Optional[ProductDict]:
        return data.PRODUCTS.get(code.upper())

    def dealer_price(self, product: ProductDict, dealer: DealerDict) -> int:
        return data.dealer_price(product, dealer)

    def set_stock(self, code: str, sizes: dict) -> Optional[ProductDict]:
        p = data.PRODUCTS.get(code.upper())
        if p is None:
            return None
        p["sizes"] = sizes
        return p

    # --- Admin CRUD (chỉ có nghĩa với nguồn demo) ---
    def upsert(self, code: str, patch: dict) -> Optional[ProductDict]:
        p = data.PRODUCTS.get(code.upper())
        if p is None:
            return None
        p.update(patch)
        return p

    def add(self, product: ProductDict) -> ProductDict:
        data.PRODUCTS[product["code"]] = product
        return product

    def remove(self, code: str) -> bool:
        return data.PRODUCTS.pop(code.upper(), None) is not None

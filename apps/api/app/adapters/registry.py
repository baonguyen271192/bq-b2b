"""Chọn adapter theo cấu hình. Đây là RANH GIỚI duy nhất biết 'demo' hay 'sapb1'.

`api.py` và `assistant.py` chỉ nhìn thấy `provider` — chúng không được phép biết
dữ liệu đến từ đâu. Thêm nguồn thứ ba sau này (vd ERP khác) chỉ sửa file này.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from app.ports import CatalogPort, DealerPort, OrderPort
from app.settings import settings


@dataclass(frozen=True)
class Provider:
    catalog: CatalogPort
    dealers: DealerPort
    orders: OrderPort
    source: str


@lru_cache(maxsize=1)
def get_provider() -> Provider:
    if settings.data_source == "sapb1":
        from .sapb1 import ServiceLayerClient
        from .sapb1.catalog import SapB1Catalog
        from .sapb1.dealers import SapB1Dealers
        from .sapb1.orders import SapB1Orders

        cfg = settings.sapb1
        cfg.validate()
        client = ServiceLayerClient(
            base_url=cfg.base_url,
            company_db=cfg.company_db,
            username=cfg.username,
            password=cfg.password,
            verify_ssl=cfg.verify_ssl,
        )
        return Provider(
            catalog=SapB1Catalog(client),
            dealers=SapB1Dealers(client),
            orders=SapB1Orders(client),
            source="sapb1",
        )

    if settings.data_source != "demo":
        raise RuntimeError(
            f"BQ_DATA_SOURCE='{settings.data_source}' không hợp lệ (dùng 'demo' hoặc 'sapb1')."
        )

    from .demo import DemoCatalog, DemoDealers, DemoOrders

    return Provider(
        catalog=DemoCatalog(), dealers=DemoDealers(), orders=DemoOrders(), source="demo"
    )

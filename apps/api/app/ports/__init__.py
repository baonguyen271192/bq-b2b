"""Hợp đồng (port) giữa nghiệp vụ và nguồn dữ liệu.

`api.py` / `assistant.py` CHỈ được phụ thuộc vào các Protocol trong gói này, không
bao giờ import thẳng `data.py` / `store.py` / client SAP nữa. Nhờ vậy đổi nguồn dữ
liệu (demo -> SAP Business One) là đổi adapter, không sửa nghiệp vụ.

Xem `app/adapters/registry.py` để biết adapter nào đang được chọn.
"""

from .catalog import CatalogPort
from .dealers import DealerPort
from .orders import OrderPort
from .models import DealerDict, ProductDict, OrderDict, PaymentDict

__all__ = [
    "CatalogPort",
    "DealerPort",
    "OrderPort",
    "DealerDict",
    "ProductDict",
    "OrderDict",
    "PaymentDict",
]

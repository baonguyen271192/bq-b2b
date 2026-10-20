"""Adapter DEMO — dữ liệu mẫu trong repo (`data.py`, `catalog.py`, SQLite `store.py`).

Đây là adapter đang dùng cho bản pitch. Nó CHỈ ủy quyền sang code sẵn có nên hành vi
giữ nguyên 100%; mục đích duy nhất là đưa code đó vào sau một hợp đồng rõ ràng để
adapter SAP B1 có thể thay thế mà không ai bên ngoài biết.
"""

from .catalog import DemoCatalog
from .dealers import DemoDealers
from .orders import DemoOrders

__all__ = ["DemoCatalog", "DemoDealers", "DemoOrders"]

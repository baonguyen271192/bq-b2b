"""Đơn sỉ ghi vào SAP B1 (Sales Order) qua Service Layer.

Nhắc lại ranh giới bất biến: GHI qua Service Layer, KHÔNG INSERT thẳng vào ORDR/RDR1.
"""

from __future__ import annotations

import os
from typing import List, Optional, Set

from app.ports.models import DealerDict, OrderDict, PaymentDict
from . import mapping
from .service_layer import NeedsMapping, ServiceLayerClient


class SapB1Orders:
    def __init__(self, client: ServiceLayerClient):
        self._client = client
        self._warehouse = os.getenv("SAPB1_WAREHOUSE", "01")

    def create(self, dealer: DealerDict, items: List[dict], subtotal: int, delivery: str,
               payment: str, over_limit: bool, channel: str, created_at: str) -> OrderDict:
        payload = mapping.order_to_b1_payload(
            dealer, items, self._warehouse, comments=f"BQ {channel} · {delivery} · {payment}"
        )
        doc = self._client.post("/Orders", payload)
        return mapping.b1_order_to_order(doc)

    def get(self, oid: str) -> Optional[OrderDict]:
        doc = self._client.get(f"/Orders({int(oid)})")
        return mapping.b1_order_to_order(doc) if doc else None

    def list(self, dealer_code: Optional[str] = None) -> List[OrderDict]:
        path = "/Orders?$orderby=DocEntry desc"
        if dealer_code:
            path += f"&$filter=CardCode eq '{dealer_code}'"
        return [mapping.b1_order_to_order(d) for d in self._client.iter_all(path)]

    def set_status(self, oid: str, status: str, approver: Optional[str] = None,
                   note: Optional[str] = None) -> Optional[OrderDict]:
        raise NeedsMapping(
            "Vòng đời đơn của BQ (Chờ xác nhận -> Đóng gói -> Bàn giao -> Đã nhận) "
            "chi tiết hơn DocStatus của B1 (chỉ Open/Closed). Phải chốt: lưu bằng UDF "
            "trên Orders, hay bằng chuỗi chứng từ (Delivery, Invoice), hay giữ ở DB BQ "
            "và chỉ đẩy sang B1 ở các mốc kế toán."
        )

    def add_payment(self, dealer_code: str, order_id: str, amount: int, method: str,
                    created_at: str) -> None:
        raise NeedsMapping(
            "Thanh toán phải tạo IncomingPayments và đối trừ đúng hoá đơn — cần biết "
            "BQ đối trừ theo hoá đơn (Invoice) hay theo đơn (Order)."
        )

    def list_payments(self, dealer_code: str) -> List[PaymentDict]:
        raise NeedsMapping("Đọc IncomingPayments: cần chốt phạm vi ngày và cách lọc.")

    def paid_order_ids(self, dealer_code: str) -> Set[str]:
        raise NeedsMapping("Phụ thuộc cách đối trừ ở add_payment.")

    def outstanding_credit(self, dealer_code: str) -> int:
        # Số này B1 đã tính sẵn — dùng thẳng thay vì cộng lại từ đơn.
        bp = self._client.get(
            f"/BusinessPartners('{dealer_code}')?$select=CurrentAccountBalance"
        )
        return int(bp.get("CurrentAccountBalance") or 0)

    def credit_orders(self, dealer_code: str) -> List[OrderDict]:
        raise NeedsMapping("Hoá đơn công nợ: đọc từ Invoices, cần chốt điều kiện lọc.")

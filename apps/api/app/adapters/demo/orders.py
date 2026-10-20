"""Đơn hàng từ SQLite trong repo (`store.py`)."""

from __future__ import annotations

from typing import List, Optional, Set

from app import store
from app.ports.models import DealerDict, OrderDict, PaymentDict


class DemoOrders:
    def create(self, dealer: DealerDict, items: List[dict], subtotal: int, delivery: str,
               payment: str, over_limit: bool, channel: str, created_at: str) -> OrderDict:
        return store.create_order(
            dealer, items, subtotal, delivery, payment, over_limit, channel, created_at
        )

    def get(self, oid: str) -> Optional[OrderDict]:
        return store.get_order(oid)

    def list(self, dealer_code: Optional[str] = None) -> List[OrderDict]:
        return store.list_orders(dealer_code)

    def set_status(self, oid: str, status: str, approver: Optional[str] = None,
                   note: Optional[str] = None) -> Optional[OrderDict]:
        return store.set_status(oid, status, approver, note)

    def add_payment(self, dealer_code: str, order_id: str, amount: int, method: str,
                    created_at: str) -> None:
        store.add_payment(dealer_code, order_id, amount, method, created_at)

    def list_payments(self, dealer_code: str) -> List[PaymentDict]:
        return store.list_payments(dealer_code)

    def paid_order_ids(self, dealer_code: str) -> Set[str]:
        return store.paid_order_ids(dealer_code)

    def outstanding_credit(self, dealer_code: str) -> int:
        return store.outstanding_credit(dealer_code)

    def credit_orders(self, dealer_code: str) -> List[OrderDict]:
        return store.credit_orders(dealer_code)

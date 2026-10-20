"""Port đơn hàng sỉ + thanh toán."""

from __future__ import annotations

from typing import List, Optional, Protocol, Set

from .models import DealerDict, OrderDict, PaymentDict


class OrderPort(Protocol):
    def create(
        self,
        dealer: DealerDict,
        items: List[dict],
        subtotal: int,
        delivery: str,
        payment: str,
        over_limit: bool,
        channel: str,
        created_at: str,
    ) -> OrderDict:
        """Ghi đơn mới.

        SAP B1: GHI BẮT BUỘC qua Service Layer (`POST /Orders`) hoặc DI API — ghi
        thẳng vào bảng ORDR/RDR1 sẽ phá data integrity và mất hỗ trợ từ SAP.
        """
        ...

    def get(self, oid: str) -> Optional[OrderDict]:
        ...

    def list(self, dealer_code: Optional[str] = None) -> List[OrderDict]:
        ...

    def set_status(
        self, oid: str, status: str, approver: Optional[str] = None, note: Optional[str] = None
    ) -> Optional[OrderDict]:
        ...

    # --- Thanh toán & công nợ ---
    def add_payment(
        self, dealer_code: str, order_id: str, amount: int, method: str, created_at: str
    ) -> None:
        ...

    def list_payments(self, dealer_code: str) -> List[PaymentDict]:
        ...

    def paid_order_ids(self, dealer_code: str) -> Set[str]:
        ...

    def outstanding_credit(self, dealer_code: str) -> int:
        ...

    def credit_orders(self, dealer_code: str) -> List[OrderDict]:
        """Đơn công nợ hiển thị như hoá đơn (kèm cờ `paid`)."""
        ...

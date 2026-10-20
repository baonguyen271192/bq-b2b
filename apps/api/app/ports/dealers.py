"""Port đại lý: hồ sơ + hạn mức công nợ."""

from __future__ import annotations

from typing import Dict, List, Optional, Protocol

from .models import DealerDict


class DealerPort(Protocol):
    def all(self) -> List[DealerDict]:
        ...

    def get(self, code: str) -> Optional[DealerDict]:
        ...

    def credit_used(self, dealer: DealerDict) -> int:
        """Công nợ đã dùng.

        Demo: công nợ đầu kỳ + tổng đơn công nợ chưa trả (tính từ store).
        SAP B1: `CurrentAccountBalance` của BusinessPartner là số CHUẨN — ERP là
        nguồn sự thật, không tự cộng lại từ đơn hàng.
        """
        ...

    def update(self, code: str, patch: Dict) -> Optional[DealerDict]:
        ...

    def create(self, payload: Dict) -> DealerDict:
        ...

    def tier_discount(self, dealer: DealerDict) -> float:
        """Tỷ lệ chiết khấu theo bậc, dạng 0..1 (vd 0.05 = 5%).

        Demo: tra bảng TIER_DISCOUNT. SAP B1: không có khái niệm này — chiết khấu
        nằm trong bảng giá/SpecialPrices, nên adapter B1 phải suy ra hoặc từ chối.
        """
        ...

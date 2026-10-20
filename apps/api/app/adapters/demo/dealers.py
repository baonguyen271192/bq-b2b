"""Đại lý từ dữ liệu mẫu trong repo."""

from __future__ import annotations

from typing import Dict, List, Optional

from app import data
from app.ports.models import DealerDict


class DemoDealers:
    def all(self) -> List[DealerDict]:
        return list(data.DEALERS.values())

    def get(self, code: str) -> Optional[DealerDict]:
        return data.DEALERS.get(code.upper())

    def credit_used(self, dealer: DealerDict) -> int:
        return data.credit_used(dealer)

    def update(self, code: str, patch: Dict) -> Optional[DealerDict]:
        d = data.DEALERS.get(code.upper())
        if d is None:
            return None
        d.update({k: v for k, v in patch.items() if v is not None})
        return d

    def create(self, payload: Dict) -> DealerDict:
        data.DEALERS[payload["code"]] = payload
        return payload

    def tier_discount(self, dealer: DealerDict) -> float:
        return data.TIER_DISCOUNT.get(dealer.get("tier", ""), 0.0)

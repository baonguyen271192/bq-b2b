"""Đại lý từ SAP B1 Service Layer (BusinessPartners)."""

from __future__ import annotations

from typing import Dict, List, Optional

from app.ports.models import DealerDict
from . import mapping
from .service_layer import ServiceLayerClient

_SELECT = (
    "CardCode,CardName,PriceListNum,CreditLimit,CurrentAccountBalance,"
    "ContactPerson,Phone1,EmailAddress,Address"
)


class SapB1Dealers:
    def __init__(self, client: ServiceLayerClient):
        self._client = client

    def all(self) -> List[DealerDict]:
        rows = self._client.list(
            f"/BusinessPartners?$select={_SELECT}&$filter=CardType eq 'cCustomer'"
        )
        return [mapping.business_partner_to_dealer(r) for r in rows]

    def get(self, code: str) -> Optional[DealerDict]:
        bp = self._client.get(f"/BusinessPartners('{code}')?$select={_SELECT}")
        return mapping.business_partner_to_dealer(bp) if bp else None

    def credit_used(self, dealer: DealerDict) -> int:
        # ERP là nguồn sự thật: đọc thẳng số dư công nợ, không cộng lại từ đơn hàng.
        return int(dealer.get("credit_opening") or 0)

    def update(self, code: str, patch: Dict) -> Optional[DealerDict]:
        # PATCH chỉ nên mở cho các trường liên lạc. Hạn mức công nợ là quyết định của
        # kế toán → sửa trong B1, không sửa từ app bán hàng.
        allowed = {"Phone1", "EmailAddress", "ContactPerson", "Address"}
        body = {k: v for k, v in patch.items() if k in allowed}
        if not body:
            return self.get(code)
        self._client.patch(f"/BusinessPartners('{code}')", body)
        return self.get(code)

    def create(self, payload: Dict) -> DealerDict:
        bp = self._client.post("/BusinessPartners", payload)
        return mapping.business_partner_to_dealer(bp)

    def tier_discount(self, dealer: DealerDict) -> float:
        from .service_layer import NeedsMapping

        raise NeedsMapping(
            "B1 không có 'chiết khấu theo bậc' như demo — giá đã nằm sẵn trong bảng "
            "giá/SpecialPrices. Cần chốt có hiển thị % chiết khấu cho đại lý hay không."
        )

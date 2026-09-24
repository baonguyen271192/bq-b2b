"""FastAPI server cho hệ thống đặt đơn sỉ Giày BQ — Web/App đại lý + Admin.

Chỉ phục vụ nghiệp vụ SỈ (B2B đại lý) của riêng BQ:
  - REST API cho Web dashboard (sale/quản lý) & App đại lý (mobile).
  - Trợ lý AI cho đại lý (answer) và cho sale/quản lý (answer_sale).

Bot bán lẻ Facebook đã tách thành service Commerce độc lập
(xem ../../zalo-rag-bot/commerce) — không còn thuộc phạm vi BQ.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from . import store, data
from .api import router as api_router

load_dotenv()

app = FastAPI(title="BQ B2B — Web/App đại lý")

# Cho FE Web/App (Next.js chạy ở cổng khác) gọi API. Demo nên mở rộng; production siết lại.
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

store.init_db()
app.include_router(api_router)


def _seed_one_payment() -> None:
    """Nếu chưa có giao dịch nào: ghi 1 thanh toán cho 1 đơn công nợ đã giao,
    để lịch sử giao dịch có sẵn 1 giao dịch hoàn thành (dữ liệu thật trong DB)."""
    import time as _t
    for d in data.DEALERS.values():
        if store.list_payments(d["code"]):
            continue
        delivered = [o for o in store.credit_orders(d["code"])
                     if "nhận" in o["status"].lower() and not o.get("paid")]
        if delivered:
            o = delivered[-1]  # đơn cũ nhất đã giao
            store.add_payment(d["code"], o["id"], o["subtotal"], "Chuyển khoản", _t.strftime("%d/%m/%Y %H:%M"))


_seed_one_payment()


@app.get("/health")
async def health():
    return {"status": "ok"}

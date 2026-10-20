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

from . import store
from .adapters.registry import get_provider
from .api import router as api_router

load_dotenv()

P = get_provider()

app = FastAPI(title="BQ B2B — Web/App đại lý")

# Cho FE Web/App (Next.js chạy ở cổng khác) và app mobile gọi API.
# CẢNH BÁO: allow_origins=['*'] chỉ chấp nhận được cho demo. Trước khi lên thật
# phải liệt kê domain cụ thể — nhất là khi đã nối SAP B1 (dữ liệu ERP thật).
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# init_db chỉ có nghĩa với nguồn 'demo' (SQLite trong repo). Nguồn ERP không cần.
if P.source == "demo":
    store.init_db()

app.include_router(api_router)


def _seed_one_payment() -> None:
    """Mồi dữ liệu DEMO: nếu chưa có giao dịch nào thì ghi 1 thanh toán cho 1 đơn công
    nợ đã giao, để lịch sử giao dịch có sẵn một giao dịch hoàn thành.

    Chỉ chạy với nguồn 'demo' — không bao giờ ghi dữ liệu mồi vào ERP thật.
    """
    import time as _t
    for d in P.dealers.all():
        if P.orders.list_payments(d["code"]):
            continue
        delivered = [o for o in P.orders.credit_orders(d["code"])
                     if "nhận" in o["status"].lower() and not o.get("paid")]
        if delivered:
            o = delivered[-1]  # đơn cũ nhất đã giao
            P.orders.add_payment(d["code"], o["id"], o["subtotal"], "Chuyển khoản",
                                 _t.strftime("%d/%m/%Y %H:%M"))


if P.source == "demo":
    _seed_one_payment()


@app.get("/health")
async def health():
    return {"status": "ok"}

"""Service trợ lý AI của BQ (Python/FastAPI).

Giữ bằng Python có chủ ý: khối xử lý tiếng Việt (bỏ dấu, nhận diện ý định, phân
tích hội thoại đặt đơn) cộng hai client LLM. Lõi giao dịch — đơn hàng, công nợ,
SAP Business One — nằm ở `apps/api-java`. Xem docs/architecture.md §8.

Service này KHÔNG có cơ sở dữ liệu riêng: mọi số liệu đọc từ backend Java qua
`bq_client`, nên nối SAP B1 chỉ là việc của Java.
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router as api_router

load_dotenv()

app = FastAPI(
    title="BQ — Service trợ lý AI",
    description="Hai đường dẫn trợ lý. Mọi nghiệp vụ khác do apps/api-java phục vụ.",
)

# Bình thường chỉ backend Java gọi service này (proxy nội bộ), nên KHÔNG cần mở
# CORS cho trình duyệt. Chỉ mở khi thật sự gọi thẳng từ FE lúc phát triển.
if os.getenv("BQ_ASSISTANT_CORS", "").strip():
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("BQ_ASSISTANT_CORS").split(","),
        allow_methods=["POST"],
        allow_headers=["*"],
    )

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "assistant"}

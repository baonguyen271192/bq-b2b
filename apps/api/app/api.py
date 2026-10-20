"""REST API của service TRỢ LÝ AI.

Service này chỉ còn phục vụ hai đường dẫn trợ lý. Mười chín route còn lại (đại lý,
danh mục, đơn hàng, công nợ, admin) do backend Java phục vụ — xem `apps/api-java`.

Vì sao gỡ bỏ các route trùng: hai service cùng phục vụ một bề mặt API là bẫy vận
hành. Trỏ frontend nhầm cổng thì nó VẪN CHẠY, chỉ là chạy trên backend khác với số
liệu khác — không có lỗi nào bật lên. Thà để 404 còn hơn trả lời bằng dữ liệu sai.

Frontend/mobile không đổi: chúng gọi Java ở :8100, và Java chuyển tiếp
`/api/assistant*` sang đây.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from . import assistant

router = APIRouter(prefix="/api")


class AssistantBody(BaseModel):
    dealer_code: str
    question: str


class SaleAssistantBody(BaseModel):
    question: str


@router.post("/assistant")
def ask_assistant(body: AssistantBody):
    """Trợ lý cho ĐẠI LÝ — hỏi đáp trên dữ liệu thật của chính đại lý đó."""
    return assistant.answer(body.dealer_code, body.question)


@router.post("/assistant/sale")
def ask_sale_assistant(body: SaleAssistantBody):
    """Trợ lý cho SALE/quản lý — dữ liệu toàn hệ thống."""
    return assistant.answer_sale(body.question)

"""REST API cho FE Web (dashboard sale) và FE App (đại lý mobile) — nghiệp vụ SỈ của BQ.

Dùng chung engine đại lý/store với Web & App. Mọi đơn tạo qua API đều vào 1
nguồn store — đơn đặt ở kênh nào cũng hiện ở các kênh còn lại.
"""

import time
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import data, store, assistant

router = APIRouter(prefix="/api")


# ---------- Đại lý & sản phẩm ----------

def _dealer_out(d: dict) -> dict:
    used = data.credit_used(d)
    return {**d, "credit_used": used, "credit_available": d["credit_limit"] - used}


@router.get("/dealers")
def list_dealers():
    return [_dealer_out(d) for d in data.DEALERS.values()]


@router.get("/dealers/{code}")
def get_dealer(code: str):
    d = data.DEALERS.get(code.upper())
    if not d:
        raise HTTPException(404, "Đại lý không tồn tại")
    return _dealer_out(d)


@router.get("/dealers/{code}/credit")
def dealer_credit(code: str):
    """Chi tiết công nợ: hạn mức + hoá đơn (từ đơn công nợ thật, không mock)."""
    d = data.DEALERS.get(code.upper())
    if not d:
        raise HTTPException(404, "Đại lý không tồn tại")
    used = data.credit_used(d)
    return {
        "credit_limit": d["credit_limit"],
        "credit_used": used,
        "credit_available": d["credit_limit"] - used,
        "invoices": store.credit_orders(code.upper()),
        "transactions": store.list_payments(code.upper()),
    }


class PayBody(BaseModel):
    method: str = "Chuyển khoản"


@router.post("/orders/{oid}/pay")
def pay_order(oid: str, body: PayBody):
    """Ghi nhận thanh toán cho 1 đơn công nợ (giao dịch thật, trừ vào công nợ)."""
    o = store.get_order(oid)
    if not o:
        raise HTTPException(404, "Đơn không tồn tại")
    store.add_payment(o["dealer_code"], oid, o["subtotal"], body.method, time.strftime("%d/%m/%Y %H:%M"))
    return {"ok": True, "order_id": oid, "amount": o["subtotal"]}


@router.get("/products")
def list_products(dealer: Optional[str] = None, category: Optional[str] = None):
    """Trả sản phẩm kèm giá sỉ theo đại lý (nếu truyền ?dealer=DL001)."""
    d = data.DEALERS.get((dealer or "").upper())
    items = data.PRODUCTS.values()
    if category:
        items = [p for p in items if p["category"] == category]
    out = []
    for p in items:
        price = data.dealer_price(p, d) if d else p["wholesale"]
        out.append({**p, "price": price})
    return out


@router.get("/categories")
def list_categories():
    return data.CATEGORIES


# ---------- Trợ lý đại lý (RAG) ----------

class AssistantBody(BaseModel):
    dealer_code: str
    question: str


@router.post("/assistant")
def ask_assistant(body: AssistantBody):
    """Hỏi–đáp dựa trên dữ liệu thật của đại lý. Nối RAI qua env RAI_URL."""
    return assistant.answer(body.dealer_code, body.question)


class SaleAssistantBody(BaseModel):
    question: str


@router.post("/assistant/sale")
def ask_sale_assistant(body: SaleAssistantBody):
    """Trợ lý cho sale/quản lý — dữ liệu toàn hệ thống (đại lý, công nợ, đơn)."""
    return assistant.answer_sale(body.question)


# ---------- Đơn hàng (sỉ) ----------

class OrderLine(BaseModel):
    code: str
    sizes: Dict[str, int]   # {"40": 10, "41": 5}


class CreateOrder(BaseModel):
    dealer_code: str
    lines: List[OrderLine]
    delivery: str = "Kho HCM"
    payment: str = "Công nợ"
    channel: str = "app"    # 'app' | 'web' | 'ai-chat'


@router.post("/orders")
def create_order(body: CreateOrder):
    d = data.DEALERS.get(body.dealer_code.upper())
    if not d:
        raise HTTPException(404, "Đại lý không tồn tại")

    items, subtotal = [], 0
    for line in body.lines:
        p = data.PRODUCTS.get(line.code.upper())
        if not p:
            raise HTTPException(400, f"Sản phẩm {line.code} không tồn tại")
        unit = data.dealer_price(p, d)
        valid = {}
        for size, qty in line.sizes.items():
            if size in p["sizes"] and 0 < qty <= p["sizes"][size]:
                valid[size] = qty
        if not valid:
            continue
        qty_total = sum(valid.values())
        line_total = qty_total * unit
        items.append({"code": p["code"], "name": p["name"], "sizes": valid,
                      "unit_price": unit, "qty_total": qty_total, "line_total": line_total})
        subtotal += line_total

    if not items:
        raise HTTPException(400, "Đơn không có dòng hợp lệ")

    over = subtotal > data.credit_available(d)
    order = store.create_order(
        dealer=d, items=items, subtotal=subtotal, delivery=body.delivery,
        payment=body.payment, over_limit=over, channel=body.channel,
        created_at=time.strftime("%d/%m/%Y %H:%M"),
    )
    return order


@router.get("/orders")
def list_orders(dealer: Optional[str] = None):
    return store.list_orders(dealer.upper() if dealer else None)


@router.get("/orders/{oid}")
def get_order(oid: str):
    o = store.get_order(oid)
    if not o:
        raise HTTPException(404, "Đơn không tồn tại")
    return o


class ApproveBody(BaseModel):
    approve: bool
    approver: str = "Quản lý bán hàng"
    note: str = ""


@router.post("/orders/{oid}/approve")
def approve_order(oid: str, body: ApproveBody):
    """Sale/quản lý duyệt hoặc từ chối đơn VƯỢT HẠN MỨC đang chờ duyệt."""
    o = store.get_order(oid)
    if not o:
        raise HTTPException(404, "Đơn không tồn tại")
    status = "Đã xác nhận" if body.approve else "Đã từ chối"
    note = body.note or ("Đã duyệt ngoại lệ" if body.approve else "Từ chối")
    return store.set_status(oid, status, approver=body.approver, note=note)


# Vòng đời đơn hàng sỉ (theo slide) — sale đẩy đơn tiến qua từng bước.
LIFECYCLE = [
    "Chờ xác nhận",
    "Đã xác nhận",
    "Đang đóng gói",
    "Đang bàn giao vận chuyển",
    "Đại lý đã nhận",
]


class AdvanceBody(BaseModel):
    actor: str = "Quản lý bán hàng"


@router.post("/orders/{oid}/advance")
def advance_order(oid: str, body: AdvanceBody):
    """Đẩy đơn sang trạng thái kế tiếp trong vòng đời."""
    o = store.get_order(oid)
    if not o:
        raise HTTPException(404, "Đơn không tồn tại")
    cur = o["status"]
    if cur not in LIFECYCLE:
        raise HTTPException(400, f"Không thể đẩy đơn ở trạng thái '{cur}'")
    idx = LIFECYCLE.index(cur)
    if idx >= len(LIFECYCLE) - 1:
        raise HTTPException(400, "Đơn đã ở trạng thái cuối")
    return store.set_status(oid, LIFECYCLE[idx + 1], approver=body.actor, note=f"Cập nhật bởi {body.actor}")


@router.post("/orders/{oid}/cancel")
def cancel_order(oid: str, body: AdvanceBody):
    o = store.get_order(oid)
    if not o:
        raise HTTPException(404, "Đơn không tồn tại")
    return store.set_status(oid, "Đã huỷ", approver=body.actor, note="Đã huỷ đơn")


# ==================== ADMIN (1 role) ====================
# Lưu ý: sản phẩm & đại lý đang giữ trong bộ nhớ (data.py) → CRUD hiệu lực tới khi
# restart server. Đơn/thanh toán vẫn bền trong SQLite.

def _active(o: dict) -> bool:
    st = o["status"].lower()
    return "huỷ" not in st and "hủy" not in st and "từ chối" not in st


@router.get("/admin/analytics")
def admin_analytics():
    from collections import Counter
    orders = store.list_orders(None)
    prod_qty: Counter = Counter()
    for o in orders:
        if _active(o):
            for it in o["items"]:
                prod_qty[it["name"]] += it["qty_total"]
    low_stock = []
    for p in data.PRODUCTS.values():
        for sz, n in p["sizes"].items():
            if n <= 5:
                low_stock.append({"code": p["code"], "name": p["name"], "size": sz, "stock": n})
    aging = []
    for d in data.DEALERS.values():
        out = store.outstanding_credit(d["code"])
        if out > 0:
            aging.append({"code": d["code"], "name": d["name"], "outstanding": out})

    # Tuổi nợ THẬT: phân nhóm hoá đơn công nợ chưa trả theo số ngày kể từ ngày đặt.
    from datetime import datetime
    buckets = [
        {"label": "0–30 ngày", "min": 0, "max": 30, "amount": 0, "count": 0},
        {"label": "31–60 ngày", "min": 31, "max": 60, "amount": 0, "count": 0},
        {"label": "61–90 ngày", "min": 61, "max": 90, "amount": 0, "count": 0},
        {"label": "Trên 90 ngày", "min": 91, "max": 10**9, "amount": 0, "count": 0},
    ]
    now = datetime.now()
    for d in data.DEALERS.values():
        for inv in store.credit_orders(d["code"]):
            if inv.get("paid"):
                continue
            try:
                created = datetime.strptime(inv["created_at"], "%d/%m/%Y %H:%M")
                days = max(0, (now - created).days)
            except (ValueError, KeyError):
                days = 0
            for b in buckets:
                if b["min"] <= days <= b["max"]:
                    b["amount"] += inv["subtotal"]
                    b["count"] += 1
                    break
    aging_buckets = [{"label": b["label"], "amount": b["amount"], "count": b["count"]} for b in buckets]

    return {
        "gmv_total": sum(o["subtotal"] for o in orders if _active(o)),
        "orders_total": len(orders),
        "by_status": dict(Counter(o["status"] for o in orders)),
        "by_channel": dict(Counter(o["channel"] for o in orders)),
        "top_products": [{"name": n, "pairs": q} for n, q in prod_qty.most_common(5)],
        "low_stock": low_stock,
        "total_outstanding": sum(a["outstanding"] for a in aging),
        "aging": sorted(aging, key=lambda x: -x["outstanding"]),
        "aging_buckets": aging_buckets,
    }


class ProductBody(BaseModel):
    code: str
    name: str
    category: str
    retail: int
    wholesale: int
    sizes: Dict[str, int]
    images: Optional[List[str]] = None


@router.get("/admin/products")
def admin_products():
    return list(data.PRODUCTS.values())


@router.post("/admin/products")
def admin_create_product(body: ProductBody):
    code = body.code.upper()
    if code in data.PRODUCTS:
        raise HTTPException(400, "Mã sản phẩm đã tồn tại")
    imgs = body.images or []
    data.PRODUCTS[code] = {
        "code": code, "name": body.name, "category": body.category,
        "retail": body.retail, "wholesale": body.wholesale, "sizes": body.sizes,
        "images": imgs, "image": imgs[0] if imgs else "",
    }
    return data.PRODUCTS[code]


@router.put("/admin/products/{code}")
def admin_update_product(code: str, body: ProductBody):
    p = data.PRODUCTS.get(code.upper())
    if not p:
        raise HTTPException(404, "Sản phẩm không tồn tại")
    p.update({"name": body.name, "category": body.category, "retail": body.retail,
              "wholesale": body.wholesale, "sizes": body.sizes})
    if body.images:
        p["images"] = body.images
        p["image"] = body.images[0]
    return p


@router.delete("/admin/products/{code}")
def admin_delete_product(code: str):
    if code.upper() not in data.PRODUCTS:
        raise HTTPException(404, "Sản phẩm không tồn tại")
    del data.PRODUCTS[code.upper()]
    return {"ok": True}


class DealerUpdate(BaseModel):
    tier: Optional[str] = None
    credit_limit: Optional[int] = None
    owner: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    invoice_address: Optional[str] = None


@router.put("/admin/dealers/{code}")
def admin_update_dealer(code: str, body: DealerUpdate):
    d = data.DEALERS.get(code.upper())
    if not d:
        raise HTTPException(404, "Đại lý không tồn tại")
    for k, v in body.dict(exclude_none=True).items():
        d[k] = v
    return _dealer_out(d)


@router.post("/admin/dealers")
def admin_create_dealer(body: dict):
    code = str(body.get("code", "")).upper()
    if not code or code in data.DEALERS:
        raise HTTPException(400, "Mã đại lý trống hoặc đã tồn tại")
    data.DEALERS[code] = {
        "code": code, "name": body.get("name", code), "tier": body.get("tier", "Đồng"),
        "credit_limit": int(body.get("credit_limit", 0)), "credit_opening": 0,
        "owner": body.get("owner", ""), "phone": body.get("phone", ""),
        "email": body.get("email", ""), "invoice_address": body.get("invoice_address", ""),
    }
    return _dealer_out(data.DEALERS[code])

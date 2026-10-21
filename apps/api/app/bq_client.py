"""Client đọc dữ liệu từ backend Java.

Vì sao service trợ lý KHÔNG tự đọc dữ liệu nữa:

Trước đây Python có đủ bộ `ports/` + `adapters/` y hệt Java. Nghĩa là khi nối SAP
Business One, phải cấu hình và bảo trì HAI lớp ánh xạ cho cùng một thứ — đúng cái
mà cả tầng port sinh ra để tránh. Tệ hơn: hai service có thể trỏ vào hai nguồn khác
nhau mà không ai phát hiện, vì cả hai đều trả lời bình thường.

Giờ Java làm chủ TOÀN BỘ việc đọc/ghi dữ liệu; Python chỉ còn phần xử lý tiếng Việt
và gọi LLM. Nối SAP B1 là việc của riêng Java.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_BASE = os.getenv("BQ_API_URL", "http://127.0.0.1:8100").rstrip("/")
TIMEOUT = float(os.getenv("BQ_API_TIMEOUT", "20"))

# Một câu hỏi của trợ lý đọc danh mục nhiều lần. Cache ngắn trong tiến trình để
# không bắn hàng chục request cho cùng một câu — nhưng đủ ngắn để số tồn/công nợ
# không bị cũ giữa các câu hỏi.
_CACHE_TTL = float(os.getenv("BQ_API_CACHE_TTL", "15"))
_cache: dict[str, tuple[float, Any]] = {}


class BqApiError(RuntimeError):
    """Backend Java không trả lời được. Trợ lý phải hạ cấp lịch sự, không vỡ."""


def _get(path: str, *, cache: bool = True) -> Any:
    now = time.monotonic()
    if cache:
        hit = _cache.get(path)
        if hit and now - hit[0] < _CACHE_TTL:
            return hit[1]

    url = f"{API_BASE}{path}"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as res:
            data = json.loads(res.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise BqApiError(f"{url} -> HTTP {e.code}") from e
    except Exception as e:  # lỗi mạng, timeout, JSON hỏng
        raise BqApiError(f"{url} -> {e}") from e

    if cache:
        _cache[path] = (now, data)
    return data


def _post(path: str, body: dict, *, headers: dict[str, str] | None = None) -> Any:
    """Ghi sang backend Java. KHÔNG cache, KHÔNG nuốt lỗi.

    Đọc sai thì trợ lý trả lời cũ một chút; ghi sai thì khách mất đơn hoặc lên hai
    đơn. Nên đường ghi để lỗi nổ ra cho tầng gọi xử lý tử tế.
    """
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise BqApiError(f"{url} -> HTTP {e.code}: {detail}") from e
    except Exception as e:
        raise BqApiError(f"{url} -> {e}") from e


def _q(value: str) -> str:
    return urllib.parse.quote(str(value), safe="")


# ---------- Đại lý ----------

def dealer(code: str) -> dict | None:
    """Hồ sơ đại lý. Đã kèm sẵn credit_used / credit_available do Java tính."""
    return _get(f"/api/dealers/{_q(code.upper())}")


def dealers() -> list[dict]:
    return _get("/api/dealers") or []


def credit(code: str) -> dict:
    """Chi tiết công nợ: hạn mức + invoices + transactions."""
    return _get(f"/api/dealers/{_q(code.upper())}/credit") or {
        "invoices": [], "transactions": [],
    }


# ---------- Danh mục ----------

def products(dealer_code: str) -> list[dict]:
    """Sản phẩm kèm `price` ĐÃ áp bậc của đại lý — không phải tự tính lại."""
    return _get(f"/api/products?dealer={_q(dealer_code.upper())}") or []


def product(dealer_code: str, code: str) -> dict | None:
    target = code.upper()
    for p in products(dealer_code):
        if p.get("code", "").upper() == target:
            return p
    return None


def admin_products() -> list[dict]:
    """Danh mục KHÔNG gắn đại lý — dùng cho bán lẻ.

    `products(dealer_code)` trả `price` đã áp bậc của đại lý; khách lẻ không có bậc
    nào, giá của họ là `retail`. Gọi bằng một mã đại lý bất kỳ rồi lờ `price` đi sẽ
    chạy, nhưng là nói dối trong code — ai đọc sau cũng tưởng bot bán giá sỉ.
    """
    return _get("/api/admin/products") or []


def create_retail_order(payload: dict, ingest_key: str) -> dict:
    """Bot chốt đơn lẻ. Backend tự kiểm lại tổng tiền và từ chối nếu lệch."""
    return _post("/api/retail/orders", payload,
                 headers={"X-BQ-Retail-Key": ingest_key})


def categories() -> list[str]:
    return _get("/api/categories") or []


# ---------- Đơn hàng ----------

def orders(dealer_code: str | None = None) -> list[dict]:
    path = "/api/orders" + (f"?dealer={_q(dealer_code.upper())}" if dealer_code else "")
    return _get(path) or []


def credit_orders(dealer_code: str) -> list[dict]:
    return credit(dealer_code).get("invoices", [])


def payments(dealer_code: str) -> list[dict]:
    return credit(dealer_code).get("transactions", [])


# ---------- Dẫn xuất ----------

def tier_discount_pct(dealer_code: str) -> int:
    """
    Phần trăm chiết khấu theo bậc, CHỈ để hiển thị.

    API không trả trường này (SAP B1 không có khái niệm chiết khấu theo bậc — giá
    đã nằm trong bảng giá). Suy ngược từ một sản phẩm bất kỳ: giá sỉ cơ bản so với
    giá đại lý thực trả. Không có sản phẩm nào thì trả 0 thay vì đoán.
    """
    for p in products(dealer_code):
        base = p.get("wholesale") or 0
        price = p.get("price") or 0
        if base > 0 and price > 0:
            return round((1 - price / base) * 100)
    return 0


def clear_cache() -> None:
    _cache.clear()

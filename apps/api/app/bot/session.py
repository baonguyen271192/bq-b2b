"""Phiên hội thoại của từng khách, trong bộ nhớ tiến trình.

GIỚI HẠN ĐÃ BIẾT, cố ý chấp nhận ở bước này:

- Khởi động lại service là mất hết giỏ hàng đang dở. Khách phải chọn lại.
- Chạy nhiều bản sao (nhiều worker uvicorn, hoặc nhiều instance trên Render) thì
  mỗi bản giữ một phiên riêng; khách bị trả lời như người lạ tuỳ request rơi vào
  bản nào. **Chạy MỘT worker cho tới khi thay bằng Redis.**

Không dựng Redis ngay vì nó thêm một hạ tầng phải bàn giao cho BQ, trong khi phiên
chốt đơn chỉ sống vài phút. Khi nào có lưu lượng thật thì đổi `_STORE` thành Redis
— phần còn lại của gói không cần biết.
"""

from __future__ import annotations

import time

# Khách bỏ ngang giữa chừng là chuyện thường. Giữ quá lâu thì giỏ cũ sống lại lúc
# họ quay về sau hai ngày, giá và tồn đã khác.
TTL_SECONDS = 60 * 60

_STORE: dict[str, dict] = {}


def _new(sender_id: str, channel: str) -> dict:
    return {
        "sender_id": sender_id,
        "channel": channel,
        "state": "idle",
        "cart": [],          # [{code, name, sizes:{size:qty}, unit_price}]
        "focus": None,       # mã sản phẩm đang xem
        "customer": {},      # name / phone / address
        "payment": None,
        "touched": time.time(),
    }


def get(sender_id: str, channel: str = "facebook") -> dict:
    now = time.time()
    sess = _STORE.get(sender_id)
    if sess is None or now - sess["touched"] > TTL_SECONDS:
        sess = _new(sender_id, channel)
        _STORE[sender_id] = sess
    sess["touched"] = now
    sess["channel"] = channel
    return sess


def reset(sender_id: str) -> None:
    _STORE.pop(sender_id, None)


def sweep() -> int:
    """Dọn phiên hết hạn. Gọi định kỳ để bộ nhớ không phình theo số khách."""
    now = time.time()
    dead = [k for k, v in _STORE.items() if now - v["touched"] > TTL_SECONDS]
    for k in dead:
        _STORE.pop(k, None)
    return len(dead)


def count() -> int:
    return len(_STORE)

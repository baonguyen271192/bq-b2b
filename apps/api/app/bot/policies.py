"""Chính sách BÁN LẺ của BQ — dữ liệu bot dùng để trả lời khách vãng lai.

KHÔNG tái dùng `POLICIES` trong `assistant.py`: bộ đó là chính sách BÁN SỈ
(chiết khấu theo hạng đại lý, công nợ 30 ngày, giao tới kho chi nhánh). Đọc cho
khách lẻ nghe là sai hoàn toàn — và sai một cách rất thuyết phục, kiểu sai tệ nhất.

CHƯA CÓ NỘI DUNG: phí ship, thời gian giao, đổi trả, bảo hành của kênh bán lẻ là
thông tin BQ phải cung cấp, không phải thứ lập trình viên bịa ra. Khi còn trống,
bot thú nhận chưa biết và xin số điện thoại — đúng hơn là đoán bừa rồi BQ phải
chịu lời hứa mình không đưa ra.

Cách điền: tạo một file JSON dạng {"van_chuyen": "...", "doi_tra": "..."} rồi trỏ
biến môi trường BQ_RETAIL_POLICIES_FILE vào đó. Không cần sửa code, không deploy lại.
"""

from __future__ import annotations

import json
import os
import time

# Khoá gợi ý để BQ biết cần điền những gì.
EXPECTED_KEYS = ("van_chuyen", "phi_ship", "doi_tra", "bao_hanh", "thanh_toan",
                 "gio_mo_cua", "dia_chi_cua_hang")

_cache: tuple[float, dict[str, str]] | None = None
_TTL = 60.0


def load() -> dict[str, str]:
    """Đọc chính sách từ file. Rỗng khi chưa cấu hình — KHÔNG có giá trị mặc định."""
    global _cache
    now = time.monotonic()
    if _cache and now - _cache[0] < _TTL:
        return _cache[1]

    path = os.getenv("BQ_RETAIL_POLICIES_FILE", "").strip()
    data: dict[str, str] = {}
    if path:
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
            data = {str(k): str(v) for k, v in raw.items() if str(v).strip()}
        except Exception as e:  # noqa: BLE001 — file hỏng không được kéo sập bot
            print(f"[bot] không đọc được {path}: {e}")

    _cache = (now, data)
    return data


def missing() -> list[str]:
    """Khoá gợi ý chưa được điền — để /health của bot báo ra, không im lặng."""
    have = load()
    return [k for k in EXPECTED_KEYS if k not in have]

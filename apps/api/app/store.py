"""Kho đơn hàng SỈ (SQLite) — nguồn đơn cho Web dashboard & App đại lý của BQ.

Khi lên production, thay SQLite bằng ERP/DB thật, giữ nguyên interface.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading

_DB_PATH = os.path.join(os.path.dirname(__file__), "orders.db")
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(_DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id            TEXT PRIMARY KEY,
                dealer_code   TEXT NOT NULL,
                dealer_name   TEXT NOT NULL,
                items_json    TEXT NOT NULL,
                subtotal      INTEGER NOT NULL,
                delivery      TEXT,
                payment       TEXT,
                status        TEXT NOT NULL,
                channel       TEXT NOT NULL,
                over_limit    INTEGER NOT NULL DEFAULT 0,
                created_at    TEXT NOT NULL,
                approver      TEXT,
                approve_note  TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id           TEXT PRIMARY KEY,
                dealer_code  TEXT NOT NULL,
                order_id     TEXT,
                amount       INTEGER NOT NULL,
                method       TEXT NOT NULL,
                created_at   TEXT NOT NULL
            )
        """)


# Bộ đếm mã đơn (đọc từ đơn lớn nhất đã có để không trùng khi restart)
def _next_order_id() -> str:
    with _conn() as c:
        row = c.execute(
            "SELECT id FROM orders WHERE id LIKE 'BQ%' ORDER BY id DESC LIMIT 1"
        ).fetchone()
    n = 1000
    if row:
        try:
            n = int(row["id"].replace("BQ", ""))
        except ValueError:
            pass
    return f"BQ{n + 1}"


def create_order(dealer: dict, items: list, subtotal: int, delivery: str,
                 payment: str, over_limit: bool, channel: str, created_at: str) -> dict:
    """Tạo đơn mới. channel: 'app' | 'web' | 'ai-chat'."""
    with _lock:
        oid = _next_order_id()
        status = "Chờ duyệt (vượt hạn mức)" if over_limit else "Chờ xác nhận"
        with _conn() as c:
            c.execute(
                """INSERT INTO orders (id, dealer_code, dealer_name, items_json,
                   subtotal, delivery, payment, status, channel, over_limit, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (oid, dealer["code"], dealer["name"], json.dumps(items, ensure_ascii=False),
                 subtotal, delivery, payment, status, channel, int(over_limit), created_at),
            )
    return get_order(oid)


def get_order(oid: str) -> dict | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
    return _row_to_dict(row) if row else None


def list_orders(dealer_code: str | None = None) -> list[dict]:
    q = "SELECT * FROM orders"
    args: tuple = ()
    if dealer_code:
        q += " WHERE dealer_code = ?"
        args = (dealer_code,)
    q += " ORDER BY id DESC"
    with _conn() as c:
        rows = c.execute(q, args).fetchall()
    return [_row_to_dict(r) for r in rows]


def set_status(oid: str, status: str, approver: str | None = None,
               note: str | None = None) -> dict | None:
    with _conn() as c:
        c.execute(
            "UPDATE orders SET status = ?, approver = ?, approve_note = ? WHERE id = ?",
            (status, approver, note, oid),
        )
    return get_order(oid)


# ---------- Thanh toán ----------

def add_payment(dealer_code: str, order_id: str, amount: int, method: str, created_at: str) -> None:
    with _lock:
        with _conn() as c:
            n = c.execute("SELECT COUNT(*) FROM payments").fetchone()[0]
            pid = f"TT-{1000 + n + 1}"
            c.execute(
                "INSERT INTO payments (id, dealer_code, order_id, amount, method, created_at) VALUES (?,?,?,?,?,?)",
                (pid, dealer_code, order_id, amount, method, created_at),
            )


def list_payments(dealer_code: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM payments WHERE dealer_code = ? ORDER BY id DESC", (dealer_code,)
        ).fetchall()
    return [dict(r) for r in rows]


def paid_order_ids(dealer_code: str) -> set:
    with _conn() as c:
        rows = c.execute(
            "SELECT DISTINCT order_id FROM payments WHERE dealer_code = ? AND order_id IS NOT NULL", (dealer_code,)
        ).fetchall()
    return {r["order_id"] for r in rows}


def _is_credit_order(o: dict) -> bool:
    st = o["status"].lower()
    return ("nợ" in (o["payment"] or "").lower()
            and "huỷ" not in st and "hủy" not in st and "từ chối" not in st)


def outstanding_credit(dealer_code: str) -> int:
    """Công nợ còn lại = tổng đơn công nợ CHƯA thanh toán."""
    paid = paid_order_ids(dealer_code)
    return sum(o["subtotal"] for o in list_orders(dealer_code)
               if _is_credit_order(o) and o["id"] not in paid)


def credit_orders(dealer_code: str) -> list[dict]:
    """Đơn công nợ để hiển thị như hoá đơn (kèm cờ đã thanh toán)."""
    paid = paid_order_ids(dealer_code)
    out = []
    for o in list_orders(dealer_code):
        if _is_credit_order(o):
            out.append({**o, "paid": o["id"] in paid})
    return out


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["items"] = json.loads(d.pop("items_json"))
    d["over_limit"] = bool(d["over_limit"])
    return d

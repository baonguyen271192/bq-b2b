#!/usr/bin/env python3
"""Xuất dữ liệu demo từ bản Python sang JSON cho backend Java.

Hai backend PHẢI chạy trên cùng dữ liệu thì mới đối chiếu kết quả được. Script này
là nguồn duy nhất sinh ra resources/demo/*.json — đừng sửa tay các file đó.

    cd apps/api && ./.venv/bin/python ../api-java/scripts/export-demo-data.py

Lưu ý: ghi đủ MỌI trường mà record Java khai báo, kể cả trường tính toán như
`price` (= 0). Jackson 3 từ chối map null vào primitive, và cố ý giữ như vậy:
nới `fail-on-null-for-primitives` sẽ âm thầm biến null thành 0 ở những chỗ nguy
hiểm hơn nhiều, ví dụ `subtotal` của đơn hàng.
"""

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "api"))

from app import catalog, data  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parents[1] / "src/main/resources/demo"


def write(name: str, payload) -> None:
    path = OUT / name
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"  {path.relative_to(OUT.parents[3])}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    products = [
        {
            "code": p["code"],
            "name": p["name"],
            "category": p["category"],
            "retail": p["retail"],
            "wholesale": p["wholesale"],
            # Giá theo đại lý được tính lúc chạy; để 0 cho khớp kiểu long của Java.
            "price": 0,
            "sizes": p["sizes"],
            "image": p.get("image") or (p.get("images") or [""])[0],
            "images": p.get("images", []),
            "colors": p.get("colors", []),
        }
        for p in catalog.PRODUCTS.values()
    ]

    write("products.json", products)
    write("categories.json", catalog.CATEGORIES)
    write("dealers.json", [dict(d) for d in data.DEALERS.values()])
    write("tier-discounts.json", data.TIER_DISCOUNT)
    print(f"Xong: {len(products)} sản phẩm, {len(data.DEALERS)} đại lý.")


if __name__ == "__main__":
    main()

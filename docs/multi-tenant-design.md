# Thiết kế Multi-Tenant — Bot bán hàng BQ cho nhiều cửa hàng (SaaS)

> ⚠️ **ĐÃ THAY THẾ (16/09/2026).** Bản thiết kế này từng được triển khai TRỰC TIẾP
> trong repo `BQ` (bảng `stores`, `store_id` xuyên suốt, trang `/bots`). Sau đó đã
> **đảo ngược hoàn toàn**: toàn bộ logic bot bán lẻ + đa cửa hàng được tách ra
> thành service **Commerce** độc lập trong `../zalo-rag-bot/commerce` (xem
> `omnichannel-bot-design.md`), để `BQ` chỉ còn nghiệp vụ B2B sỉ của riêng mình.
> Giữ tài liệu này lại để tham khảo lý do thiết kế ban đầu — **không phản ánh
> trạng thái code hiện tại của `BQ`**.

> **Mục tiêu ban đầu:** Từ hệ thống hiện tại (1 cửa hàng) → nền tảng SaaS phục vụ **nhiều shop của nhiều chủ khác nhau**, mỗi shop có Fanpage riêng, sản phẩm/đơn/tồn kho riêng, và **admin riêng chỉ thấy dữ liệu của mình**.
>
> Ngày lập: 16/09/2026 · Phạm vi: kiến trúc + lộ trình triển khai.

---

## 1. Bối cảnh & vấn đề

Hệ thống hiện tại là **single-tenant** (một cửa hàng):

| Thành phần | Hiện tại | Vấn đề khi nhiều shop |
|---|---|---|
| Facebook | 1 `PAGE_ACCESS_TOKEN`, 1 Fanpage | Mỗi shop 1 Fanpage + 1 token riêng |
| Đơn hàng | 1 file `orders.db` chung | Đơn các shop trộn lẫn |
| Sản phẩm | 1 catalog (`catalog.py`) | Mỗi shop bán mẫu khác nhau, giá khác nhau |
| Đại lý / khách | dùng chung | Của shop nào shop nấy |
| Admin | 1 trang, thấy tất cả | Chủ shop A không được thấy dữ liệu shop B |
| Giọng bot / chính sách | cố định | Mỗi shop muốn tên, tone, chính sách riêng |

**Yêu cầu:** một codebase, một lần triển khai, phục vụ N shop **cách ly hoàn toàn** với nhau, và **mở shop mới không cần sửa code**.

---

## 2. Khái niệm cốt lõi: `store_id` (mã cửa hàng)

Toàn hệ thống thêm một chiều dữ liệu duy nhất: **`store_id`**. Mọi bản ghi (sản phẩm, đơn, đại lý, khách, phiên chat) đều **gắn `store_id`**, và **mọi truy vấn đều lọc theo `store_id`**. Đây là nguyên tắc bất biến — không có truy vấn nào "quên" `store_id`.

Ba vai người dùng:

- **Super Admin** (bạn — chủ nền tảng): quản lý danh sách shop, tạo/khoá shop, xem tổng quan toàn hệ thống.
- **Shop Admin** (chủ mỗi shop): đăng nhập, **chỉ thấy dữ liệu shop mình** (đơn, sản phẩm, tồn kho, công nợ, trợ lý AI).
- **Khách lẻ / Đại lý** (người mua): nhắn Fanpage của shop nào thì vào đúng shop đó.

---

## 3. Kiến trúc tổng thể

```
                    ┌─────────────────────────────────────────┐
   Fanpage Shop A ──┐                                          │
   Fanpage Shop B ──┼──►  1 Facebook App  ──►  /webhook  ──────┤
   Fanpage Shop C ──┘         (1 webhook)         │            │
                                                  ▼            │
                                    entry.id (Page ID)         │
                                                  │            │
                                    tra bảng stores            │
                                    page_id → store_id         │
                                                  │            │
                          ┌───────────────────────┴─────────┐  │
                          ▼                                  ▼  │
                    Nạp context shop                  Gửi trả lời│
                    (catalog, chính sách,             bằng token │
                     tone của store_id)               của store  │
                          │                                      │
                          ▼                                      │
                    Bot xử lý (engine) — session gắn store_id    │
                          │                                      │
                          ▼                                      │
                    Ghi đơn vào DB kèm store_id                  │
                                                                 │
   Shop Admin A ──► /admin (đăng nhập) ──► CHỈ dữ liệu store A ──┤
   Shop Admin B ──► /admin (đăng nhập) ──► CHỈ dữ liệu store B ──┤
   Super Admin  ──► /admin/platform    ──► toàn bộ shop  ────────┘
```

**Điểm mấu chốt (Facebook):** một Facebook App gắn được nhiều Fanpage; mỗi tin webhook kèm `entry.id` = **Page ID** nhận tin. Bot tra `page_id → store_id`, nạp đúng context và trả lời bằng **Page Access Token của shop đó**. Nhờ vậy **1 webhook phục vụ mọi shop**.

---

## 4. Mô hình dữ liệu (thay đổi schema)

### 4.1. Bảng mới: `stores`
| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` (store_id) | TEXT PK | Mã cửa hàng (vd `bq-hn`, `shop-abc`) |
| `name` | TEXT | Tên shop hiển thị |
| `fb_page_id` | TEXT UNIQUE | ID Fanpage (để route webhook) |
| `fb_page_token` | TEXT | Page Access Token (gửi trả lời) — **mã hoá khi lưu** |
| `verify_token` | TEXT | Token verify webhook riêng shop (tuỳ chọn) |
| `tone` | TEXT | Giọng bot: warm/pro… |
| `policies_json` | TEXT | Chính sách ship/thanh toán/đổi trả riêng |
| `status` | TEXT | active / suspended |
| `created_at` | TEXT | Ngày tạo |

### 4.2. Bảng mới: `users` (đăng nhập admin)
| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | TEXT PK | |
| `email` | TEXT UNIQUE | Đăng nhập |
| `password_hash` | TEXT | Băm (bcrypt/argon2) |
| `role` | TEXT | `super_admin` \| `shop_admin` |
| `store_id` | TEXT FK | shop_admin thuộc shop nào (super_admin = null) |

### 4.3. Thêm `store_id` vào bảng hiện có
- `products` → thêm `store_id` (mỗi shop catalog riêng; hoặc catalog dùng chung + bảng `store_products` map giá/tồn theo shop — xem §7).
- `orders` → thêm `store_id`.
- `dealers` → thêm `store_id`.
- `payments` → thêm `store_id`.
- Session bot → key theo `(store_id, psid)` thay vì chỉ `psid`.

> **Bất biến:** mọi hàm `store.list_orders`, `data.PRODUCTS`, analytics… nhận thêm tham số `store_id` và **luôn** lọc theo nó.

---

## 5. Luồng webhook đa shop

```python
# /webhook (giả lược)
for entry in body["entry"]:
    page_id = entry["id"]                       # Page nào nhận tin
    store = stores.by_page_id(page_id)          # tra ra cửa hàng
    if not store or store.status != "active":
        continue
    for event in entry["messaging"]:
        psid = event["sender"]["id"]
        text = extract(event)
        replies = engine.handle(store.id, psid, text)   # xử lý theo store
        messenger.send_all(store.fb_page_token, psid, replies)  # token của store
```

Thay đổi so với hiện tại:
- `engine.handle(psid, text)` → `engine.handle(store_id, psid, text)`; session key = `(store_id, psid)`.
- `messenger.send(psid, msg)` → nhận thêm **token của shop** thay vì 1 token global từ `.env`.
- Catalog/chính sách/tone nạp theo `store_id`.

---

## 6. Admin + phân quyền

- **Đăng nhập** (`/admin/login`): email + mật khẩu → phát JWT/session chứa `role` + `store_id`.
- **Middleware**: mọi API admin đọc `store_id` từ token đăng nhập, **không nhận `store_id` từ client** (chống xem trộm shop khác).
- **Shop Admin**: mọi trang (Tổng quan, Đơn, Sản phẩm, Đại lý, Công nợ, Trợ lý AI) tự lọc theo `store_id` của người đăng nhập.
- **Super Admin** (`/admin/platform`): danh sách shop, tạo shop mới (nhập page_id + token), khoá/mở shop, xem tổng doanh số toàn nền tảng.
- Trợ lý Sale/Đại lý: `build_sale_context` / `build_context` nhận `store_id` → chỉ gom dữ liệu shop đó.

---

## 7. Catalog: dùng chung hay riêng?

Hai lựa chọn (chọn theo nhu cầu khách):

| | **7A. Catalog riêng mỗi shop** | **7B. Catalog chung + giá/tồn theo shop** |
|---|---|---|
| Cách | `products` gắn `store_id` | 1 bảng `products` chung + `store_products(store_id, code, price, stock)` |
| Hợp khi | Các shop bán mẫu hoàn toàn khác nhau | Cùng nguồn hàng (vd chuỗi/đại lý cùng NCC), khác giá/tồn |
| Ưu | Đơn giản, linh hoạt tối đa | Không lặp dữ liệu, cập nhật mẫu 1 nơi |

→ **Khuyến nghị 7A** cho SaaS nhiều chủ độc lập (mỗi shop tự up sản phẩm của mình).

---

## 8. Onboarding một shop mới (quy trình vận hành)

1. Super Admin tạo shop trong `/admin/platform`: nhập tên, tone, chính sách.
2. Chủ shop kết nối Fanpage: cấp quyền cho Facebook App → lấy **Page ID + Page Access Token** → lưu vào `stores`.
3. Fanpage **subscribe webhook** (fields `messages`, `messaging_postbacks`).
4. Chủ shop up sản phẩm (hoặc import), tạo tài khoản `shop_admin`.
5. Xong — khách nhắn Fanpage đó là bot phục vụ ngay, đơn về đúng admin của shop.

> **Không cần deploy lại** khi thêm shop — chỉ thêm bản ghi + kết nối Fanpage.

---

## 9. Bảo mật & cách ly

- **Lọc theo `store_id` ở tầng server**, lấy từ token đăng nhập / page_id — **không tin client**.
- **Mã hoá** `fb_page_token` khi lưu (secret).
- Rate-limit webhook; xác thực chữ ký `X-Hub-Signature-256` của Facebook.
- Mỗi shop 1 `verify_token` (hoặc chung 1 verify token cấp App — Facebook cho phép).
- Log/telemetry gắn `store_id` để tra sự cố theo shop.

---

## 10. Lộ trình di trú từ hệ thống hiện tại

**Giai đoạn 1 — Nền multi-tenant (không đổi UX):**
- Thêm bảng `stores`, `users`; thêm cột `store_id` vào các bảng; tạo 1 shop mặc định (`default`) gán toàn bộ dữ liệu hiện có.
- Sửa `engine.handle`, `messenger.send`, `store.*`, `build_context`, `build_sale_context` nhận `store_id`.

**Giai đoạn 2 — Route theo Fanpage:**
- Webhook đọc `entry.id` → `store_id`; gửi trả lời bằng token của store.
- Bảng `stores` giữ nhiều page_id + token.

**Giai đoạn 3 — Admin phân quyền:**
- Trang đăng nhập; middleware lọc `store_id`; trang Super Admin quản shop.

**Giai đoạn 4 — Self-service onboarding:**
- Luồng chủ shop tự kết nối Fanpage + up sản phẩm.

Mỗi giai đoạn chạy được độc lập; có thể dừng ở GĐ 3 nếu Super Admin tự tạo shop cho khách.

---

## 11. Ngoài phạm vi (đợt sau)

- Thanh toán/subscription cho chủ shop (tính phí SaaS).
- Tuỳ biến giao diện admin theo thương hiệu (white-label).
- Phân tích so sánh giữa các shop cho Super Admin.
- Import sản phẩm hàng loạt (Excel/API sàn).

---

## 12. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Quên lọc `store_id` ở 1 truy vấn → lộ dữ liệu chéo | Bọc mọi truy vấn qua 1 lớp repository bắt buộc truyền `store_id`; test cách ly |
| Facebook App Review cho `pages_messaging` | Nộp duyệt sớm; mỗi Fanpage khách tự cấp quyền |
| Token Fanpage hết hạn | Dùng long-lived token; cảnh báo khi lỗi 190 |
| Nhiều shop tải nặng | Tách DB theo shard nếu lớn; hiện SQLite đủ cho quy mô nhỏ–vừa |

---

*Tài liệu thiết kế — cần bạn duyệt trước khi lập kế hoạch triển khai chi tiết.*

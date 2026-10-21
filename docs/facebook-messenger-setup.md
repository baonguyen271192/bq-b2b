# Nối bot bán lẻ với Trang Facebook của BQ

Code bot đã xong (`apps/api/app/bot/`). Tài liệu này là phần **không nằm trong
code**: tạo Meta app, lấy token, đăng ký webhook.

> **Ai làm được:** cần quyền **quản trị Trang Facebook của BQ**. Lập trình viên
> không tự làm thay được — token gắn với Trang, và Meta bắt xác minh doanh nghiệp.

---

## 0. Chuẩn bị

| Thứ cần | Ghi chú |
|---|---|
| Trang Facebook của BQ | Không phải trang cá nhân |
| Tài khoản Meta có quyền quản trị Trang đó | |
| URL HTTPS công khai trỏ tới `apps/api` | Meta **không chấp nhận** `http://` hay `localhost` |
| `apps/api` và `apps/api-java` đang chạy | |

Lúc phát triển, dùng ngrok để có HTTPS:

```bash
ngrok http 8101
# -> https://abc123.ngrok-free.app   (webhook: .../api/bot/webhook)
```

---

## 1. Tạo Meta app

1. Vào <https://developers.facebook.com/apps> → **Create App**
2. Use case: **Other** → App type: **Business**
3. Đặt tên (vd `BQ Dealer Bot`), chọn Business Portfolio của BQ
4. Trong app vừa tạo: **Add product** → **Messenger** → *Set up*

---

## 2. Lấy ba giá trị cấu hình

### `FB_APP_SECRET`

**App settings → Basic → App Secret → Show.**

Dùng để xác chữ ký `X-Hub-Signature-256` trên mọi request Meta gửi vào. **Thiếu
biến này thì webhook trả 503 và không nhận gì** — cố ý: webhook là URL công khai,
không xác thực nghĩa là ai cũng giả làm Facebook và tạo đơn cho BQ.

### `FB_PAGE_ACCESS_TOKEN`

**Messenger → Settings → Access Tokens → Add or remove Pages** → chọn Trang của BQ
→ **Generate token**.

Token gắn với **một Trang cụ thể**. Đổi Trang là phải sinh lại.

### `FB_VERIFY_TOKEN`

Chuỗi **do bạn tự đặt**, không phải Meta cấp. Nó chỉ để Meta chứng minh đang gọi
đúng server của bạn lúc đăng ký webhook.

```bash
openssl rand -hex 16
```

---

## 3. Đăng ký webhook

**Messenger → Settings → Webhooks → Add Callback URL**

| Ô | Điền |
|---|---|
| Callback URL | `https://<domain>/api/bot/webhook` |
| Verify Token | đúng chuỗi `FB_VERIFY_TOKEN` ở trên |

> **Đặt biến môi trường và khởi động lại service TRƯỚC khi bấm Verify.** Meta gọi
> `GET` ngay lúc bấm; service chưa có `FB_VERIFY_TOKEN` sẽ trả 503 và Meta báo lỗi.

Bấm **Verify and Save**, rồi **Add subscriptions** cho Trang, tick:

- `messages` — khách gõ chữ
- `messaging_postbacks` — khách bấm nút trên thẻ sản phẩm

Hai cái này là **bắt buộc**. Thiếu `messaging_postbacks` thì nút "Chọn size" không
có tác dụng gì.

---

## 4. Biến môi trường

`apps/api/.env` (service bot):

```bash
FB_VERIFY_TOKEN=<chuỗi tự đặt ở bước 2>
FB_APP_SECRET=<App Secret>
FB_PAGE_ACCESS_TOKEN=<token của Trang BQ>

BQ_API_URL=http://127.0.0.1:8100
BQ_RETAIL_INGEST_KEY=<sinh bằng: openssl rand -hex 32>
BQ_RETAIL_POLICIES_FILE=            # xem bước 6
```

`apps/api-java/.env` (backend):

```bash
BQ_RETAIL_INGEST_KEY=<ĐÚNG CHUỖI TRÊN>
```

> Hai khoá này **phải trùng nhau**. Lệch thì bot chốt đơn xong với khách rồi backend
> trả 401 — khách tưởng đã đặt được, BQ không có đơn nào.

Trên Render: cả hai biến đã khai sẵn trong `render.yaml` với `sync: false`, điền giá
trị trong dashboard.

---

## 5. Kiểm tra từng lớp

Làm theo thứ tự, lớp dưới hỏng thì lớp trên không bao giờ chạy.

```bash
# 1. Backend nhận được đơn chưa
curl -s -X POST localhost:8100/api/retail/orders \
  -H 'Content-Type: application/json' -H "X-BQ-Retail-Key: $BQ_RETAIL_INGEST_KEY" \
  -d '{"items":[{"code":"GBW0295","name":"Test","sizes":{"39":1},"unit_price":689000}],
       "subtotal":689000,"payment":"COD","channel":"facebook",
       "customer_name":"Test","customer_phone":"0912345678"}'
# Mong đợi: JSON có "id":"BQL...".
#   401 = sai khoá · 503 = chưa đặt khoá bên Java
#   400 = body sai hợp đồng; phần "detail" nói rõ trường nào, vd:
#         {"detail":"customer_phone: Thiếu số điện thoại khách"}

# 2. Luồng hội thoại (chưa cần Facebook)
export BQ_BOT_SIMULATE=1   # chỉ lúc test, KHÔNG bật ở production
curl -s localhost:8101/api/bot/simulate -H 'Content-Type: application/json' \
  -d '{"sender_id":"test-1","text":"giày cao gót nữ"}'

# 3. Meta xác minh webhook
curl -s "https://<domain>/api/bot/webhook?hub.mode=subscribe\
&hub.verify_token=$FB_VERIFY_TOKEN&hub.challenge=OK123"
# Mong đợi: OK123.  403 = sai token.  503 = chưa đặt FB_VERIFY_TOKEN.
```

Lớp 4 là nhắn thật vào Trang. Xem log service: mỗi tin gửi đi ghi một dòng
`[messenger]`.

---

## 6. Chính sách bán lẻ

Bot **không bịa** phí ship hay chính sách đổi trả. Chưa điền thì nó trả lời "em chưa
có thông tin" và xin số điện thoại.

```bash
cat > /etc/bq/retail-policies.json <<'JSON'
{
  "van_chuyen": "Giao toàn quốc, nội thành 1-2 ngày, tỉnh 3-5 ngày.",
  "phi_ship": "30.000đ. Miễn phí cho đơn từ 500.000đ.",
  "doi_tra": "Đổi size trong 7 ngày nếu giày chưa sử dụng, còn đủ hộp và tem.",
  "bao_hanh": "...",
  "thanh_toan": "...",
  "gio_mo_cua": "...",
  "dia_chi_cua_hang": "..."
}
JSON
# rồi: BQ_RETAIL_POLICIES_FILE=/etc/bq/retail-policies.json
```

Đọc lại mỗi 60 giây — sửa file không cần khởi động lại service.

---

## 7. Lên chạy thật: Meta App Review

Khi app còn ở chế độ **Development**, bot **chỉ trả lời** người có vai trò trong app
(admin/developer/tester). Khách thật nhắn vào sẽ không nhận được gì.

Để mở cho công chúng, nộp **App Review** xin quyền:

- `pages_messaging`
- `pages_manage_metadata`

Meta yêu cầu xác minh doanh nghiệp và thường quay video mô tả luồng sử dụng. Tính
bằng **ngày đến tuần** — đây là đường găng, không phải việc code. Chuẩn bị sớm.

---

## 8. Lỗi hay gặp

| Hiện tượng | Nguyên nhân |
|---|---|
| Bấm Verify, Meta báo lỗi | Chưa đặt `FB_VERIFY_TOKEN`, hoặc chưa khởi động lại service, hoặc URL không HTTPS công khai |
| Webhook verify OK nhưng nhắn không ai trả lời | Chưa **Add subscriptions** cho Trang, hoặc app còn Development mà người nhắn không có vai trò trong app |
| Log đầy `401` ở `/api/bot/webhook` | `FB_APP_SECRET` sai hoặc không phải của đúng app |
| Nút "Chọn size" bấm không ăn | Thiếu subscription `messaging_postbacks` |
| Bot trả lời nhưng không lên đơn | `BQ_RETAIL_INGEST_KEY` hai bên lệch nhau — xem log `[bot] chốt đơn hỏng` |
| Log `[messenger] (chưa có token)` | Chưa đặt `FB_PAGE_ACCESS_TOKEN`. Bot vẫn chạy, chỉ không gửi được tin |
| Khách bị hỏi lại từ đầu giữa chừng | Đang chạy nhiều instance — phiên nằm trong bộ nhớ. Giữ MỘT instance (xem `architecture.md` §12.7) |

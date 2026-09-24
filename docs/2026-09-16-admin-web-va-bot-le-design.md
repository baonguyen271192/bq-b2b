# Admin Web đầy đủ + Bot Facebook cho khách lẻ — Design

Ngày: 2026-09-16 · Trạng thái: Đã duyệt, đang triển khai

## 1. Bối cảnh & vấn đề

Hệ thống BQ hiện có backend đa kênh (FastAPI + SQLite) đã hỗ trợ **cả đơn sỉ và đơn lẻ**,
nhưng frontend quản lý (`/dashboard`) chỉ là **một trang bảng đơn** trộn lẫn sỉ/lẻ,
hiển thị sai ngữ cảnh (đơn khách lẻ vẫn nằm dưới cột "Đại lý"). Nhiều năng lực backend
chưa được lộ ra: analytics, quản lý sản phẩm/tồn, đại lý, khách lẻ, công nợ.

Ngoài ra bot Facebook (`engine.py`) đang là **bot đặt sỉ cho đại lý** (hỏi mã đại lý, giá sỉ,
hạn mức, chờ duyệt) — sai vai trò kênh.

## 2. Ánh xạ kênh ↔ vai trò (chốt)

| Kênh | Vai trò | Giá | Công nợ / Duyệt |
|---|---|---|---|
| **App / Web** (Next.js `(shop)`) | Đại lý (sỉ) | Giá sỉ theo bậc | Có hạn mức, vượt → chờ duyệt |
| **Facebook** (Messenger bot) | Khách lẻ | Giá lẻ | Không, trả ngay (COD/CK) |

## 3. Phạm vi

### 3.1 Backend
- **Viết lại `engine.py`** thành luồng khách lẻ (bỏ mã đại lý/hạn mức/duyệt/chiết khấu):
  Chào → xem SP (giá lẻ) → chọn size:sốlượng → nhập Tên → SĐT → Địa chỉ → chọn COD/CK
  → xem lại → gửi → `store.create_retail_order(channel="facebook")`.
- **Hybrid AI**: ở các bước duyệt/menu, text tự do không khớp nút → route sang
  `assistant.answer_retail()` để tư vấn (giá lẻ, còn hàng, size, chính sách), rồi nhắc quay
  lại nút đặt hàng. KHÔNG route khi đang ở bước nhập Tên/SĐT/Địa chỉ (text đó là dữ liệu).
- **`assistant.answer_retail(question)`**: bộ trả lời gọn cho khách lẻ, chỉ dùng dữ liệu sản
  phẩm (giá **lẻ**, tồn theo size, danh mục) + chính sách giao/thanh toán lẻ. Không lộ
  công nợ/đại lý. Có nhánh Gemini tùy chọn (env), fallback local.
- **Retail lifecycle**: thêm `RETAIL_LIFECYCLE = ["Chờ xác nhận", "Đang đóng gói",
  "Đang giao", "Hoàn tất"]`; `/orders/{oid}/advance` chọn lifecycle theo `otype`.
  Đơn sỉ giữ nguyên `LIFECYCLE` 5 bước + duyệt hạn mức.

### 3.2 Frontend — Admin panel `/admin/*` (sidebar)
- `admin/layout.tsx`: sidebar trái + `SaleAssistant`. Không đăng nhập (1 role, demo).
- **Tổng quan** (`admin`): dùng `/admin/analytics` — KPI (GMV tổng/sỉ/lẻ, số đơn),
  đơn theo trạng thái, theo kênh, top sản phẩm, tồn thấp, tuổi nợ. Biểu đồ CSS đơn giản.
- **Đơn hàng** (`admin/orders`): 2 tab **Sỉ** / **Lẻ**, cột đúng ngữ cảnh:
  - Sỉ: Mã · Đại lý · Kênh · Giá trị (sỉ) · Trạng thái · Duyệt/Đẩy bước.
  - Lẻ: Mã · Khách (tên+SĐT) · Kênh · Giá trị (lẻ) · Thanh toán · Trạng thái (4 bước) · Đẩy bước.
- **Sản phẩm & Tồn kho** (`admin/products`): `/admin/products` CRUD, giá lẻ + sỉ, tồn theo size.
- **Đại lý** (`admin/dealers`): `/admin/dealers` xem/sửa/thêm, bậc, hạn mức.
- **Khách lẻ** (`admin/customers`): `/admin/customers` gộp theo SĐT/PSID.
- **Công nợ** (`admin/credit`): `/dealers/{code}/credit` + ghi nhận thanh toán `/orders/{oid}/pay`.
- `/dashboard` → redirect sang `/admin/orders` (giữ link cũ không hỏng).

### 3.3 Không làm (YAGNI)
- Không đăng nhập/phân quyền theo role.
- Không đụng app đại lý `(shop)`.
- Không thêm thư viện chart (dùng CSS/SVG gọn).

## 4. Kiểu dữ liệu bổ sung (frontend `lib/api.ts`)
- `Order` thêm: `otype`, `customer_name`, `customer_phone`, `customer_address`, `fb_psid`.
- Thêm types: `Analytics`, `RetailCustomer`.
- Thêm api: `analytics()`, `customers()`, `adminProducts()`, `createProduct/updateProduct/deleteProduct`,
  `updateDealer/createDealer`, `ordersByType(otype)`, `payOrder(id)`.
- `nextActionLabel` hỗ trợ cả trạng thái retail.

## 5. Kiểm thử
- Chạy backend `:8100` + frontend `:3000`.
- Simulator (`/`) đặt 1 đơn khách lẻ → xuất hiện ở tab **Lẻ** với đúng tên/SĐT, giá lẻ.
- Đẩy đơn lẻ qua 4 trạng thái. Đơn sỉ vẫn duyệt/đẩy như cũ.
- Các module admin load dữ liệu không lỗi.

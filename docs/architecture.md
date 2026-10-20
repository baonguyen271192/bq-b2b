# Kiến trúc BQ — BE / FE / Mobile

Cập nhật: 2026-10-20

## 1. Mục tiêu của cấu trúc này

Một yêu cầu duy nhất chi phối mọi quyết định dưới đây:

> **Sau khi ký hợp đồng, backend sẽ đọc/ghi dữ liệu thật trên SAP Business One.
> Việc chuyển đổi đó không được bắt frontend, mobile, hay logic nghiệp vụ phải
> viết lại.**

Mọi thứ còn lại — monorepo, package dùng chung, contract — đều là phương tiện phục
vụ yêu cầu đó.

## 2. Sơ đồ

```
                          ┌──────────────────────────────┐
   apps/web (Next.js)  ───┤                              │
   · /admin/*  dashboard  │                              │
   · /(shop)/* app đại lý │   apps/api  (FastAPI)        │
                          │                              │
   apps/mobile (Expo)  ───┤   api.py ─┐                  │
   · app native đại lý    │           │                  │
                          │   assistant.py ─┐            │
                          │                 ▼            │
                          │        ports/ (Protocol)     │
                          │                 │            │
                          │        ┌────────┴────────┐   │
                          │        ▼                 ▼   │
                          │  adapters/demo/   adapters/sapb1/
                          └──────────│───────────────│───┘
                                     ▼               ▼
                            data.py/catalog.py   SAP Business One
                            + SQLite             Service Layer (OData v4)
                            (dữ liệu pitch)      · BusinessPartners
                                                 · Items + ItemWarehouseInfo
                                                 · Orders / IncomingPayments

   packages/types  ─ kiểu dữ liệu dùng chung web + mobile
   packages/core   ─ logic nghiệp vụ thuần (format tiền, vòng đời đơn, công nợ)
   packages/api-client ─ một client, hai cấu hình (web: proxy, mobile: URL tuyệt đối)
   packages/contracts  ─ OpenAPI: hợp đồng giữa BE và hai FE
```

## 3. Cây thư mục

```
BQ/
├── apps/
│   ├── api/                    Backend FastAPI
│   │   ├── app/
│   │   │   ├── main.py         Khởi tạo app, CORS, health
│   │   │   ├── api.py          REST endpoints — CHỈ gọi qua provider
│   │   │   ├── assistant.py    Trợ lý AI đại lý + sale — CHỈ gọi qua provider
│   │   │   ├── settings.py     Cấu hình từ biến môi trường
│   │   │   ├── ports/          HỢP ĐỒNG: CatalogPort, DealerPort, OrderPort
│   │   │   ├── adapters/
│   │   │   │   ├── registry.py Chọn adapter theo BQ_DATA_SOURCE
│   │   │   │   ├── demo/       Nguồn dữ liệu mẫu (bản pitch)
│   │   │   │   └── sapb1/      SAP Business One Service Layer
│   │   │   │       ├── service_layer.py  HTTP: login, session, phân trang
│   │   │   │       ├── mapping.py        B1 ⇄ BQ (gồm bảng size)
│   │   │   │       ├── catalog.py
│   │   │   │       ├── dealers.py
│   │   │   │       └── orders.py
│   │   │   ├── data.py         Dữ liệu mẫu (chỉ adapter demo dùng)
│   │   │   ├── catalog.py      258 sản phẩm cào từ giaybq.com.vn
│   │   │   └── store.py        SQLite (chỉ adapter demo dùng)
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── web/                    Next.js 16 — dashboard sale + app đại lý (web)
│   └── mobile/                 Expo SDK 58 — app native đại lý
├── packages/
│   ├── types/                  Interface thuần, 0 dependency
│   ├── core/                   Logic nghiệp vụ thuần
│   ├── api-client/             Client gọi API, dùng chung web + mobile
│   ├── contracts/              openapi.json
│   └── tsconfig/               Cấu hình TypeScript dùng chung
├── docs/
├── render.yaml                 Deploy backend
├── vercel.json                 Deploy web
├── turbo.json
└── pnpm-workspace.yaml
```

## 4. Ranh giới bất biến

Ba quy tắc này là lý do cấu trúc tồn tại. Phá một quy tắc là xoá luôn lợi ích.

**4.1. `api.py` và `assistant.py` KHÔNG được import `data`, `store`, hay client SAP.**
Chúng chỉ nói chuyện qua `provider` (`app/adapters/registry.py`). Kiểm tra bằng:

```bash
grep -n "^from \. import data\|^from \. import store\|import httpx" apps/api/app/api.py apps/api/app/assistant.py
# Không ra kết quả = ranh giới còn nguyên.
```

**4.2. GHI vào SAP B1 luôn qua Service Layer / DI API, không bao giờ INSERT thẳng vào bảng.**
B1 đặt logic nghiệp vụ ở tầng ứng dụng, không ở trigger DB. Ghi thẳng vào `OCRD`,
`OITM`, `ORDR` sẽ phá tính toàn vẹn dữ liệu và mất hỗ trợ từ SAP. Đọc trực tiếp
(read-only) cho báo cáo nặng thì chấp nhận được.

**4.3. ERP là nguồn sự thật cho dữ liệu ERP.**
Khi đã nối B1: tồn kho, danh mục, hạn mức công nợ do B1 làm chủ. Adapter B1 **từ
chối** các thao tác ghi đó (`PermissionError` → HTTP 409) thay vì ghi ngược. Adapter
demo vẫn cho sửa vì ở đó BQ làm chủ dữ liệu.

## 5. Chuyển sang SAP B1: cần làm gì

Bật bằng biến môi trường, không sửa code nghiệp vụ:

```bash
BQ_DATA_SOURCE=sapb1
SAPB1_BASE_URL=https://sap-server.bq.local:50000/b1s/v1
SAPB1_COMPANY_DB=...
SAPB1_USERNAME=...
SAPB1_PASSWORD=...
```

### Đã viết sẵn
- Đăng nhập, giữ session, tự đăng nhập lại khi 401, phân trang `@odata.nextLink`.
- Đọc `BusinessPartners` → đại lý (gồm `CreditLimit`, `CurrentAccountBalance`).
- Đọc `Items` + `ItemWarehouseInfoCollection` → sản phẩm + tồn theo size.
- Tạo Sales Order: gom bảng size thành các `DocumentLines`.
- Dịch lỗi adapter sang HTTP rõ nghĩa (409 khi ERP làm chủ, 501 khi chưa ánh xạ).

### CHƯA xong — vì phụ thuộc bản cài thật của BQ

Những chỗ này cố ý `raise NeedsMapping` thay vì đoán, bởi ánh xạ sai sẽ **ghi dữ
liệu sai vào ERP thật** — tệ hơn là lỗi lộ ra ngay.

| Hạng mục | Cần biết gì | File |
|---|---|---|
| **Bảng size** | B1 không có size-matrix gốc. Mỗi size là một `ItemCode` riêng? Theo UDF? Add-on matrix? | `sapb1/mapping.py::parse_item_code` |
| Giá sỉ theo bậc | `PriceLists` gán theo khách, hay `SpecialPrices`, hay UDF? | `sapb1/catalog.py::dealer_price` |
| Vòng đời đơn | B1 chỉ có Open/Closed; BQ có 5 bước. Lưu bằng UDF, bằng chuỗi chứng từ, hay giữ ở DB BQ? | `sapb1/orders.py::set_status` |
| Thanh toán | `IncomingPayments` đối trừ theo Invoice hay theo Order? | `sapb1/orders.py::add_payment` |
| Công thức tồn khả dụng | `InStock - Committed`? Trừ cả `Ordered`? Theo kho nào? | `sapb1/mapping.py::_in_stock` |

### Rủi ro hạ tầng cần chốt sớm
Service Layer của B1 thường nằm trong mạng nội bộ. Nếu backend deploy trên cloud
công cộng (Render/Vercel) thì **không gọi tới được**. Ba lựa chọn: VPN site-to-site,
mở Service Layer qua reverse proxy có TLS + IP allowlist, hoặc tự host backend trong
mạng BQ (đã có `apps/api/Dockerfile`). Đây là quyết định hạ tầng, không phải code —
chốt trước khi hứa ngày go-live.

### Hiệu năng
Adapter demo đọc dict trong bộ nhớ nên gọi bao nhiêu lần cũng rẻ. Adapter B1 thì mỗi
lần là một request mạng. Trợ lý AI và trang analytics gọi `products()` nhiều lần →
**phải thêm cache có TTL trong adapter B1**, không sửa logic nghiệp vụ.

## 6. Những gì cố ý KHÔNG làm

| Không làm | Lý do |
|---|---|
| `packages/ui` dùng chung web + mobile | Web dùng Tailwind/DOM, mobile dùng primitive của React Native. Chia sẻ được chỉ khi thêm `react-native-web` — chi phí lớn hơn lợi ích ở quy mô hiện tại. |
| Tách `catalog.py` (6.510 dòng) thành JSON | Chỉ có ý nghĩa với adapter demo, và adapter đó sẽ bị thay bằng B1. Bỏ công vào nơi sắp biến mất là lãng phí. |
| Viết test | Chưa có test nào trong repo. Thêm test cho adapter demo (sắp bị thay) là sai chỗ — test nên viết cho `adapters/sapb1/mapping.py` khi đã biết quy tắc ánh xạ thật. |
| Xác thực/đăng nhập | Demo chốt cứng `DL001`. Auth thật nên gắn với tài khoản B1 hoặc SSO của BQ — quyết định sau khi ký. |

## 7. Lệnh thường dùng

```bash
# Cài đặt (lần đầu)
corepack enable pnpm
pnpm install
cd apps/api && python3.12 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

# Chạy
pnpm dev:api            # FastAPI :8100
pnpm dev:web            # Next.js :3000 (proxy /api -> :8100)
pnpm dev:mobile         # Expo

# Kiểm tra
pnpm typecheck
pnpm build
cd apps/mobile && npx expo-doctor

# Cập nhật hợp đồng API sau khi đổi backend
pnpm contracts:pull
```

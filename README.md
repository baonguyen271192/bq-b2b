# BQ B2B — Web Admin + App đại lý (bán sỉ)

Hệ thống đặt đơn sỉ cho đại lý **Giày BQ**: chọn giày → nhập số lượng theo bảng
size → đơn nháp (giá sỉ theo bậc, chiết khấu, trừ hạn mức) → giao/thanh toán →
kiểm hạn mức công nợ (trong hạn mức: chốt luôn; vượt: chờ duyệt) → sinh mã đơn →
tra trạng thái. Kèm trợ lý AI cho cả đại lý và sale.

> ⚠️ **Đang chạy trên dữ liệu mẫu** (`BQ_DATA_SOURCE=demo`). Giá/tồn/công nợ là số
> minh hoạ. Backend đã có sẵn adapter **SAP Business One** — xem
> [`docs/architecture.md`](docs/architecture.md) để biết còn thiếu gì trước khi bật.
>
> Bot bán lẻ Facebook đã tách thành service **Commerce** độc lập (`../zalo-rag-bot/commerce`).
> Repo này chỉ còn nghiệp vụ B2B sỉ của BQ.

## Cấu trúc

```
apps/api-java  ★ Backend lõi — Java 21 + Spring Boot 4, ports + adapters (demo | SAP B1)
apps/api         Service trợ lý AI — Python/FastAPI (xem docs/architecture.md §8)
apps/web         Next.js 16 — dashboard sale (/admin) + app đại lý bản web (/(shop))
apps/mobile      Expo SDK 58 — app native đại lý
packages/*       types · core · api-client · contracts · tsconfig (dùng chung web+mobile)
```

Kiến trúc, ranh giới và kế hoạch nối SAP B1: **[`docs/architecture.md`](docs/architecture.md)**.

## Chạy thử

```bash
# 1. Dependencies JavaScript (pnpm workspace)
corepack enable pnpm
pnpm install

# 2. Backend Java
export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home
cp apps/api-java/.env.example apps/api-java/.env

# 3. Service trợ lý AI (Python)
cd apps/api
python3.12 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env        # điền GROQ_API_KEY để bật trợ lý AI (không bắt buộc)
cd ../..

# 4. Chạy
pnpm dev:api                # Spring Boot  http://localhost:8100
pnpm dev:assistant          # FastAPI      http://localhost:8101  (trợ lý AI)
pnpm dev:web                # Next.js      http://localhost:3000
pnpm dev:mobile             # Expo (cần .env với EXPO_PUBLIC_API_BASE)
```

`apps/web` proxy `/api/*` sang backend qua `next.config.ts`, nên web chạy được cả
localhost lẫn tunnel ngrok mà không phải sửa IP. App mobile **không** có lớp proxy
đó — phải đặt `EXPO_PUBLIC_API_BASE` là URL tuyệt đối (emulator Android dùng
`http://10.0.2.2:8100`).

Đại lý mẫu: `DL001` (Vàng, hạn mức lớn), `DL002` (Bạc, đang vượt hạn mức — dễ thấy
luồng "vượt hạn mức → chờ duyệt"), `DL003` (Kim Cương).

## Nối SAP Business One

```bash
# apps/api-java/.env
BQ_DATA_SOURCE=sapb1
SAPB1_BASE_URL=https://sap-server.bq.local:50000/b1s/v1
SAPB1_COMPANY_DB=...
SAPB1_USERNAME=...
SAPB1_PASSWORD=...
```

Frontend và mobile **không cần sửa gì**. Phần còn phải viết nằm gọn trong
`apps/api-java/src/main/java/vn/com/giaybq/api/adapters/sapb1/` — danh sách chính xác
ở [`docs/architecture.md` §5](docs/architecture.md).

> Backend Java đã đối chiếu với bản Python: **15/16 endpoint khớp byte-for-byte**,
> 22/22 route trong hợp đồng OpenAPI đều phục vụ được. Case khác biệt duy nhất là sửa
> có chủ ý, xem [§6](docs/architecture.md).

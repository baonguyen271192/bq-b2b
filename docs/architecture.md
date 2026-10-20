# Kiến trúc BQ — BE / FE / Mobile

Cập nhật: 2026-10-20

## 1. Mục tiêu của cấu trúc này

Hai ràng buộc chi phối mọi quyết định dưới đây:

> **(a)** Sau khi ký hợp đồng, backend đọc/ghi dữ liệu thật trên **SAP Business One**.
> Việc chuyển đổi đó không được bắt frontend, mobile, hay logic nghiệp vụ viết lại.
>
> **(b)** **Team IT của BQ tiếp quản bảo trì** sau bàn giao → backend lõi dùng
> **Java/Spring Boot**, stack phổ biến ở doanh nghiệp dùng SAP.

## 2. Sơ đồ

```
   apps/web (Next.js 16)  ──┐
   · /admin/*  dashboard     │
   · /(shop)/* app đại lý    │      apps/api-java  (Spring Boot 4, Java 21)
                             ├────► web/*Controller
   apps/mobile (Expo 58) ────┤            │
   · app native đại lý       │       service/OrderService
                             │            │
                             │       ports/ (interface)
                             │            │
                             │     ┌──────┴──────┐
                             │     ▼             ▼
                             │ adapters/     adapters/
                             │  demo/         sapb1/
                             │     │             │
                             │     ▼             ▼
                             │ resources/    SAP Business One
                             │ demo/*.json   Service Layer (OData v4)
                             │ + SQLite      · BusinessPartners
                             │               · Items + ItemWarehouseInfo
                             │               · Orders / IncomingPayments
                             │
                             └────► apps/api (Python/FastAPI)
                                    · /api/assistant       trợ lý đại lý
                                    · /api/assistant/sale  trợ lý sale
                                    KHÔNG có dữ liệu riêng — đọc ngược
                                    từ Java qua bq_client (xem §8)

   packages/types      kiểu dữ liệu dùng chung web + mobile
   packages/core       logic thuần (format tiền, vòng đời đơn, công nợ)
   packages/api-client một client, hai cấu hình (web: proxy, mobile: URL tuyệt đối)
   packages/contracts  OpenAPI: hợp đồng giữa BE và hai FE
```

## 3. Cây thư mục

```
BQ/
├── apps/
│   ├── api-java/               ★ Backend lõi — Java 21 + Spring Boot 4.1.1
│   │   ├── src/main/java/vn/com/giaybq/api/
│   │   │   ├── ApiApplication.java
│   │   │   ├── config/         BqProperties, WebConfig (CORS), HttpClients
│   │   │   ├── domain/         record: Dealer, Product, Order, Analytics...
│   │   │   ├── ports/          HỢP ĐỒNG: CatalogPort, DealerPort, OrderPort
│   │   │   ├── adapters/
│   │   │   │   ├── demo/       dữ liệu mẫu + SQLite
│   │   │   │   └── sapb1/      ServiceLayerClient, SapB1Mapping, 3 adapter
│   │   │   ├── service/        OrderService (tính tiền, kiểm hạn mức)
│   │   │   └── web/            Controller + ApiExceptionHandler
│   │   ├── src/main/resources/demo/*.json   sinh từ bản Python
│   │   ├── scripts/export-demo-data.py
│   │   └── Dockerfile
│   ├── api/                    Service trợ lý AI — Python/FastAPI (cổng 8101)
│   │   └── app/{main,api,assistant,bq_client}.py   chỉ 4 file, không tầng dữ liệu
│   ├── web/                    Next.js 16
│   └── mobile/                 Expo SDK 58
├── packages/                   types · core · api-client · contracts · tsconfig
├── docs/
├── render.yaml                 2 service: bq-api (Java) + bq-assistant (Python)
├── vercel.json                 web
└── turbo.json · pnpm-workspace.yaml
```

## 4. Ranh giới bất biến

Ba quy tắc này là lý do cấu trúc tồn tại. Phá một quy tắc là xoá luôn lợi ích.

**4.1. Controller và service CHỈ phụ thuộc `ports/*`,** không bao giờ import adapter
cụ thể. Kiểm tra:

```bash
grep -rn "adapters\.demo\|adapters\.sapb1" \
  apps/api-java/src/main/java/vn/com/giaybq/api/web \
  apps/api-java/src/main/java/vn/com/giaybq/api/service
# Không ra kết quả = ranh giới còn nguyên.
```

**4.2. GHI vào SAP B1 luôn qua Service Layer / DI API, không bao giờ INSERT thẳng vào bảng.**
B1 đặt logic nghiệp vụ ở tầng ứng dụng, không ở trigger DB. Ghi thẳng vào `OCRD`,
`OITM`, `ORDR` sẽ phá tính toàn vẹn dữ liệu và mất hỗ trợ từ SAP. Đọc trực tiếp
(read-only) cho báo cáo nặng thì chấp nhận được.

**4.3. ERP là nguồn sự thật cho dữ liệu ERP.**
Khi đã nối B1: tồn kho, danh mục, hạn mức công nợ do B1 làm chủ. Adapter B1 **từ
chối** các thao tác ghi đó (`ErpOwnedException` → HTTP 409) thay vì ghi ngược.
Adapter demo vẫn cho sửa vì ở đó BQ làm chủ dữ liệu.

## 5. Chuyển sang SAP B1: cần làm gì

```bash
BQ_DATA_SOURCE=sapb1
SAPB1_BASE_URL=https://sap-server.bq.local:50000/b1s/v1
SAPB1_COMPANY_DB=...
SAPB1_USERNAME=...
SAPB1_PASSWORD=...
```

### Đã viết sẵn
- Đăng nhập, giữ phiên `B1SESSION`, tự đăng nhập lại khi 401, phân trang
  `@odata.nextLink`, ép HTTP/1.1 (xem §9).
- Đọc `BusinessPartners` → đại lý (gồm `CreditLimit`, `CurrentAccountBalance`).
- Đọc `Items` + `ItemWarehouseInfoCollection` → sản phẩm + tồn theo size.
- Tạo Sales Order: gom bảng size thành các `DocumentLines`.
- Dịch lỗi sang HTTP rõ nghĩa: 409 (ERP làm chủ), 501 (chưa ánh xạ), 502 (B1 lỗi).

### CHƯA xong — nhưng chỉ còn là ĐIỀN GIÁ TRỊ, không phải viết code

Mọi nhánh xử lý đều đã hiện thực và có test. Sau khi ký hợp đồng, phần việc còn lại
là điền các biến dưới đây trong `apps/api-java/.env` — **không sửa một dòng code nào**.

| Hạng mục | Biến cần điền | Đã hiện thực sẵn |
|---|---|---|
| **Mã hàng theo size** ⚠️ | `SAPB1_SKU_PATTERN` | regex cấu hình được; mã phẳng vẫn giữ lại, không bỏ im lặng |
| Bậc đại lý ⇄ bảng giá | `SAPB1_TIER_BY_PRICELIST` | ánh xạ hai chiều |
| Giá sỉ | `SAPB1_USE_SPECIAL_PRICES` | SpecialPrices ghi đè PriceLists, đúng thứ tự của B1; nạp cùng lúc với danh mục để tránh N+1 |
| Vòng đời đơn | `SAPB1_ORDER_STATUS_FIELD` + `_VALUES` | đọc/ghi UDF, ánh xạ hai chiều |
| Người duyệt | `SAPB1_ORDER_APPROVER_FIELD` + `_NOTE_FIELD` | ghi kèm khi PATCH trạng thái; bỏ qua nếu không khai |
| Tồn bán được | `SAPB1_STOCK_FORMULA` | 3 công thức: `in_stock`, `available`, `available_with_incoming` |
| Kho bán sỉ | `SAPB1_WAREHOUSE` | lọc theo kho hoặc cộng mọi kho |
| Đối trừ thanh toán | `SAPB1_PAYMENT_TARGET` | `invoice` (chuẩn) và `order`, cả hai đã viết |
| % chiết khấu hiển thị | `SAPB1_TIER_DISCOUNTS` | tuỳ chọn; B1 không có khái niệm này |

Danh sách đầy đủ kèm chú thích: `apps/api-java/.env.example`.

**Vẫn ném lỗi khi chưa cấu hình** — có chủ ý. Thiếu `SAPB1_TIER_BY_PRICELIST` thì
`NeedsMappingException` → HTTP 501 kèm hướng dẫn, thay vì âm thầm chạy với giá sai.

> **Điều KHÔNG cấu hình cứu được:** nếu B1 của BQ quản lý size bằng một mô hình hoàn
> toàn khác (add-on matrix có bảng riêng, hoặc size không nằm trong `ItemCode` lẫn
> UDF), thì phải viết lại `SapB1Mapping.parseItemCode` và hàm gom. Phạm vi ảnh hưởng
> được khoanh trong **một file**, không lan ra controller, FE hay mobile.

### Rủi ro hạ tầng cần chốt sớm
Service Layer của B1 thường nằm trong mạng nội bộ. Nếu backend deploy trên cloud công
cộng (Render) thì **không gọi tới được**. Ba lựa chọn: VPN site-to-site, mở Service
Layer qua reverse proxy có TLS + IP allowlist, hoặc tự host backend trong mạng BQ (đã
có `apps/api-java/Dockerfile`). Đây là quyết định hạ tầng, không phải code — chốt
trước khi hứa ngày go-live.

### Hiệu năng — đã xử lý
Adapter demo đọc bộ nhớ nên gọi bao nhiêu lần cũng rẻ. Adapter B1 thì mỗi lần là một
request mạng, và BQ đã xác nhận **toàn bộ kế toán/kho/kinh doanh đều ở SAP** — nên
không cache thì không dùng được.

`TtlCache` (mặc định 5 phút, đổi bằng `SAPB1_CATALOG_CACHE_TTL`, đặt 0 để tắt) áp dụng
cho **danh mục và nhóm hàng**. Có hai thứ **cố ý KHÔNG cache**:

- `product(code)` — gọi ngay trước khi chốt đơn để kiểm tồn theo size. Số tồn cũ ở
  đây nghĩa là **bán vượt hàng**.
- Công nợ và số dư đại lý — đó là tiền, luôn đọc tươi từ ERP.

## 6. Parity giữa Java và Python

Hai backend chạy trên **cùng dữ liệu** (`resources/demo/*.json` sinh từ Python; đơn
hàng đọc chung file `apps/api/app/orders.db`), nên đối chiếu được từng endpoint.

Kết quả đo ngày 2026-10-20: **15/16 case khớp byte-for-byte**, 22/22 route trong
`packages/contracts/openapi.json` đều tồn tại.

Case duy nhất khác là **có chủ ý**: `/api/admin/products`. Bản Python không trả trường
`price`, trong khi type `Product` của frontend khai `price` là bắt buộc — tức bản
Python vi phạm hợp đồng của chính nó. Bản Java trả `price` = giá sỉ cơ bản (admin
không xem theo một đại lý cụ thể), nhất quán với `/api/products` khi không truyền
`?dealer=`. Giao diện admin chỉ đọc `retail`/`wholesale` nên không ảnh hưởng.

## 7. Những gì cố ý KHÔNG làm

| Không làm | Lý do |
|---|---|
| `packages/ui` dùng chung web + mobile | Web dùng Tailwind/DOM, mobile dùng primitive React Native. Chia sẻ được chỉ khi thêm `react-native-web` — chi phí lớn hơn lợi ích ở quy mô hiện tại. |
| JPA/Hibernate cho adapter demo | Schema đã có sẵn (Python tạo), chỉ vài câu lệnh, và adapter này SẮP BỊ THAY bằng SAP B1. Thêm JPA là thêm lớp mapping cho thứ có tuổi thọ ngắn. |
| Nới `fail-on-null-for-primitives` | Sẽ âm thầm biến null thành 0 ở chỗ nguy hiểm (`subtotal` của đơn). Thay vào đó: script export ghi đủ mọi trường. |
| Xoá bản Python ngay | Nó vẫn là service trợ lý AI đang chạy, và là bản đối chiếu parity. Xoá khi đã có test thay thế. |

## 8. Vì sao trợ lý AI vẫn là Python

`apps/api/app/assistant.py` là ~1.000 dòng: bỏ dấu tiếng Việt, nhận diện ý định, phân
tích hội thoại đặt đơn, sinh thẻ sản phẩm, cộng hai client LLM (Groq, Gemini). Port
sang Java tốn nhiều công mà không đổi lại được gì về vận hành.

Phân tách hiện tại không phải thoả hiệp — nó là ranh giới đúng: **Java ở nơi cần giao
dịch và tính đúng tiền; Python ở nơi cần hệ sinh thái AI.** Hợp đồng API giữ nguyên:
frontend và mobile vẫn gọi đúng `/api/assistant` và `/api/assistant/sale`, Java proxy
sang.

**Python KHÔNG có tầng dữ liệu riêng.** Trước đây nó có đủ bộ `ports/` + `adapters/`
y hệt Java — nghĩa là nối SAP B1 phải cấu hình và bảo trì HAI lớp ánh xạ cho cùng một
thứ, đúng cái mà tầng port sinh ra để tránh. Tệ hơn: hai service có thể trỏ vào hai
nguồn khác nhau mà không ai phát hiện, vì cả hai đều trả lời bình thường.

Giờ Java làm chủ toàn bộ đọc/ghi; Python đọc ngược qua `app/bq_client.py` (HTTP, có
cache ngắn trong tiến trình). Service Python rút từ ~8.200 dòng xuống **4 file,
1.260 dòng**, và chỉ phục vụ đúng 2 route — 19 route trùng đã gỡ, giờ trả 404.

> Vì sao gỡ hẳn thay vì để đó cho an toàn: hai service cùng phục vụ một bề mặt API
> là bẫy vận hành. Trỏ frontend nhầm cổng thì nó VẪN CHẠY, chỉ là chạy trên backend
> khác với số liệu khác — không lỗi nào bật lên. Thà 404 còn hơn trả lời bằng dữ liệu sai.

Đánh đổi phải nói rõ: **bàn giao cho team IT của BQ sẽ là hai stack chứ không phải
một.** Nếu BQ yêu cầu một stack duy nhất, port `assistant.py` sang Java là việc riêng,
cần ước lượng riêng.

## 9. Ba cái bẫy của Spring Boot 4 đã gặp

Ghi lại vì cả ba đều biểu hiện ra ngoài khác hẳn nguyên nhân thật.

| Triệu chứng | Nguyên nhân | Nơi sửa |
|---|---|---|
| `package com.fasterxml.jackson.databind does not exist` | Boot 4 dùng **Jackson 3** — package đổi sang `tools.jackson.*`. Chỉ `jackson-annotations` giữ ở `com.fasterxml.jackson.annotation`. | toàn bộ import |
| `No bean of type RestClient$Builder` | Boot 4 **không** auto-configure bean này. | `config/HttpClients` |
| Upstream báo *"field required / body missing"* dù body dựng đúng | JDK HttpClient thử nâng cấp **HTTP/2 cleartext** (`Upgrade: h2c`) kèm `Transfer-Encoding: chunked`; server HTTP/1.1 (uvicorn, nhiều bản cài B1 Service Layer) **làm mất body**. | ép `HTTP_1_1` trong `config/HttpClients` |
| OpenAPI sinh ra ghi `dealerCode` trong khi API trả `dealer_code` | swagger-core chạy trên **Jackson 2** với ObjectMapper riêng, không thấy cấu hình của **Jackson 3**. Hợp đồng sai nguy hiểm hơn không có hợp đồng. | bean `ModelResolver` trong `config/OpenApiConfig` + test chặn hồi quy |

Cái thứ ba đáng chú ý nhất: nó sẽ xảy ra y hệt với SAP B1 Service Layer. Đã xử lý sẵn.

## 10. Lệnh thường dùng

```bash
# Cài đặt
corepack enable pnpm && pnpm install
export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home
cd apps/api && python3.12 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

# Chạy
pnpm dev:api          # Spring Boot  :8100
pnpm dev:assistant    # FastAPI      :8101  (trợ lý AI)
pnpm dev:web          # Next.js      :3000  (proxy /api -> :8100)
pnpm dev:mobile       # Expo

# Kiểm tra
pnpm typecheck
cd apps/api-java && ./mvnw verify
pnpm contracts:pull   # cập nhật openapi.json (sinh từ Java, backend phải đang chạy)
# Swagger UI: http://localhost:8100/docs  (tắt ở production: SPRINGDOC_UI_ENABLED=false)

# Sinh lại dữ liệu demo cho Java
cd apps/api && ./.venv/bin/python ../api-java/scripts/export-demo-data.py
```

## 11. Việc còn lại

1. **Lấy xác nhận cho [`docs/sap-b1-mapping-proposal.md`](sap-b1-mapping-proposal.md)**
   — bảng ánh xạ đề xuất, BQ chỉ cần đánh dấu đúng/sai. Tri thức này đáng giá hơn mọi
   dòng code tiếp theo.
2. **Test cho `SapB1Mapping`**, đặc biệt `parseItemCode`, khi đã biết quy tắc mã thật.
4. **Xác thực** — hiện chốt cứng `DL001`. Nên gắn tài khoản B1 hoặc SSO của BQ.
5. **Siết CORS** trước khi chạy với dữ liệu ERP thật (`BQ_CORS_ORIGINS`).
6. Quyết định có port `assistant.py` sang Java không (§8).

# @bq/api-java — Backend BQ (Spring Boot)

Backend chính thức của BQ sau khi chốt bàn giao cho team IT của BQ.
Java 21 LTS · Spring Boot 4.1.1 · Maven.

## Vì sao có tầng ports/adapters

BQ dùng **SAP Business One** làm DB và API thật. Tầng này để khi nối B1, không
controller/service nào phải sửa — và frontend/mobile thì hoàn toàn không biết:

```
web/*Controller  →  service/*  →  ports/*  →  adapters/demo   (dữ liệu mẫu + SQLite)
                                           └→ adapters/sapb1  (Service Layer)
```

Đổi nguồn bằng một biến môi trường:

```bash
BQ_DATA_SOURCE=demo    # hoặc sapb1
```

## Ranh giới bất biến

1. **Controller/service chỉ phụ thuộc `ports/*`.** Không bao giờ import adapter cụ thể.
2. **GHI vào B1 luôn qua Service Layer / DI API.** Không INSERT thẳng vào `OCRD`,
   `OITM`, `ORDR` — B1 đặt logic nghiệp vụ ở tầng ứng dụng, ghi thẳng sẽ phá tính
   toàn vẹn dữ liệu và mất hỗ trợ từ SAP.
3. **ERP là nguồn sự thật cho dữ liệu ERP.** Tồn kho, danh mục, hạn mức do B1 làm
   chủ → adapter B1 ném `ErpOwnedException` (HTTP 409) thay vì ghi ngược.

Chỗ nào chưa biết cấu hình B1 thật của BQ thì ném `NeedsMappingException` (HTTP 501)
thay vì đoán — ánh xạ sai, nhất là **bảng size**, sẽ ghi sai số lượng vào ERP thật.

## Chạy

```bash
export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home

./mvnw spring-boot:run                 # dev, cổng 8100
./mvnw package && java -jar target/*.jar

cp .env.example .env                   # rồi nạp biến môi trường theo cách của bạn
```

Trợ lý AI vẫn chạy ở service Python (`apps/api`) — bật nó ở **cổng khác** (mặc định
8101) rồi đặt `BQ_ASSISTANT_URL`. Java chặn ngay lúc khởi động nếu bạn trỏ trùng cổng.

## Tài liệu API

Sinh tự động từ chính code (springdoc):

| Đường dẫn | Dùng để |
|---|---|
| `/openapi.json` | đặc tả OpenAPI — nguồn của `packages/contracts/openapi.json` |
| `/docs` | giao diện Swagger để thử API bằng tay |

```bash
pnpm contracts:pull     # cập nhật packages/contracts/openapi.json (backend đang chạy)
```

> **Tắt Swagger UI ở môi trường chạy thật** với dữ liệu SAP B1: đặt
> `SPRINGDOC_UI_ENABLED=false`. Nó phơi toàn bộ bề mặt API ra ngoài.

## Dữ liệu demo

`src/main/resources/demo/*.json` sinh từ bản Python — **đừng sửa tay**:

```bash
cd ../api && ./.venv/bin/python ../api-java/scripts/export-demo-data.py
```

Đơn hàng demo đọc thẳng `../api/app/orders.db` (cùng file với bản Python), nên lịch
sử đơn không mất khi đổi backend.

## Ba cái bẫy của Spring Boot 4 đã gặp (ghi lại để khỏi mất công lần nữa)

| Triệu chứng | Nguyên nhân thật |
|---|---|
| `package com.fasterxml.jackson.databind does not exist` | Boot 4 dùng **Jackson 3**: package đổi sang `tools.jackson.*`. Chỉ `jackson-annotations` giữ nguyên ở `com.fasterxml.jackson.annotation`. |
| `No bean of type RestClient$Builder` | Boot 4 **không** auto-configure bean này. Xem `config/HttpClients`. |
| Upstream báo *"field required / body missing"* dù body đúng | JDK HttpClient thử nâng cấp **HTTP/2 cleartext** (`Upgrade: h2c`) kèm `Transfer-Encoding: chunked`; server HTTP/1.1 (uvicorn, nhiều bản cài B1 Service Layer) **làm mất body**. Đã ép `HTTP_1_1` trong `config/HttpClients`. |
| OpenAPI sinh ra ghi `dealerCode` trong khi API trả `dealer_code` | swagger-core chạy trên **Jackson 2** với ObjectMapper riêng, không thấy `spring.jackson.property-naming-strategy` của **Jackson 3**. Đã thêm bean `ModelResolver` trong `config/OpenApiConfig`; có test chặn hồi quy. |

## Còn thiếu

- **Test**: 28 test (ánh xạ SAP B1, cache, hợp đồng OpenAPI). **Chưa có** cho
  `OrderService` và các controller — mà đó mới là chỗ tính tiền.
- **Xác thực**: chưa có. Nên gắn với tài khoản B1 hoặc SSO của BQ.

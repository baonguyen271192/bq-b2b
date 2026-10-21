# BQ B2B — Web Admin + App đại lý (bán sỉ)

Hai kênh bán của **Giày BQ** trong một hệ thống:

- **Bán sỉ** — đại lý chọn giày → nhập số lượng theo bảng size → đơn nháp (giá sỉ
  theo bậc, chiết khấu, trừ hạn mức) → giao/thanh toán → kiểm hạn mức công nợ
  (trong hạn mức: chốt luôn; vượt: chờ duyệt) → sinh mã đơn → tra trạng thái.
- **Bán lẻ** — khách vãng lai nhắn Trang Facebook, bot tư vấn và chốt đơn; đơn vào
  thẳng DB của BQ và hiện trong tab "Đơn lẻ" của web admin.

Kèm trợ lý AI cho cả đại lý và sale.

> ⚠️ **Đang chạy trên dữ liệu mẫu** (`BQ_DATA_SOURCE=demo`). Giá/tồn/công nợ là số
> minh hoạ. Backend đã có sẵn adapter **SAP Business One** — xem
> [`docs/architecture.md`](docs/architecture.md) để biết còn thiếu gì trước khi bật.

---

## Cây thư mục

```
BQ/
├── apps/
│   ├── api-java/        ★ Backend lõi — Java 21 + Spring Boot 4
│   │   ├── src/main/java/vn/com/giaybq/api/
│   │   │   ├── ports/           hợp đồng: CatalogPort, DealerPort, OrderPort,
│   │   │   │                     RetailOrderPort
│   │   │   ├── adapters/demo/   dữ liệu mẫu + SQLite (tự mồi từ JSON)
│   │   │   ├── adapters/sapb1/  SAP B1 Service Layer
│   │   │   ├── service/         OrderService — tính tiền, kiểm hạn mức
│   │   │   └── web/             REST controller + xử lý lỗi
│   │   ├── src/main/resources/demo/   dữ liệu mẫu dạng JSON
│   │   └── scripts/with-java.sh       dò đúng JDK 21
│   ├── api/             Trợ lý AI + bot bán lẻ Facebook — Python/FastAPI
│   │                    KHÔNG giữ dữ liệu riêng
│   ├── web/             Next.js 16 — dashboard sale (/admin) + app đại lý (/(shop))
│   └── mobile/          React Native + Expo 58 — app đại lý iOS & Android
├── packages/
│   ├── types/           kiểu dữ liệu dùng chung web + mobile
│   ├── core/            logic thuần (format tiền, vòng đời đơn, công nợ)
│   ├── api-client/      một client, hai cấu hình (web proxy / mobile URL tuyệt đối)
│   ├── contracts/       openapi.json + script đối chiếu drift
│   ├── config/          ESLint flat config dùng chung
│   └── tsconfig/        cấu hình TypeScript dùng chung
├── docs/                architecture.md · facebook-messenger-setup.md
│                        adr/ · sap-b1-mapping-proposal.md
├── render.yaml          deploy 2 service backend
├── vercel.json          deploy web
└── turbo.json           pipeline
```

---

## Yêu cầu môi trường

| Công cụ | Phiên bản | Khai ở đâu | Bắt buộc cho |
|---|---|---|---|
| **Node.js** | `>= 20` (dùng 24) | `.nvmrc`, `package.json#engines` | tất cả |
| **pnpm** | `9.15.4` | `package.json#packageManager` | tất cả |
| **JDK** | **21** (LTS) | `apps/api-java/pom.xml` | `apps/api-java` |
| **Maven** | đi kèm `mvnw` | `.mvn/wrapper` | `apps/api-java` |
| **Python** | **3.12** | `apps/api/.python-version` | `apps/api` |

> **Không cần đặt `JAVA_HOME` bằng tay.** `apps/api-java/scripts/with-java.sh` tự dò
> JDK 21 (JAVA_HOME → `/usr/libexec/java_home` → đường dẫn Homebrew/Linux thường gặp)
> và **kiểm lại phiên bản** ở mọi nhánh — vì `java_home -v 21` có thể trả về JDK cũ
> hơn kèm mã thoát 0 khi không có bản 21 nào đăng ký với hệ thống.

---

## Cài đặt

```bash
corepack enable pnpm
pnpm install

# Service trợ lý AI (Python)
cd apps/api
python3.12 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env            # điền GROQ_API_KEY nếu muốn bật LLM
cd ../..

cp apps/api-java/.env.example apps/api-java/.env
cp apps/web/.env.example       apps/web/.env.local
cp apps/mobile/.env.example    apps/mobile/.env
```

## Chạy

| Lệnh | App | Cổng |
|---|---|---|
| `pnpm dev:api` | Spring Boot | `8100` |
| `pnpm dev:assistant` | FastAPI (trợ lý AI) | `8101` |
| `pnpm dev:web` | Next.js | `3000` |
| `pnpm dev:mobile` | Expo | — |
| `pnpm dev` | **cả 4 cùng lúc** (Turborepo) | |

`apps/web` proxy `/api/*` sang backend qua `next.config.ts`, nên chạy được cả
localhost lẫn tunnel ngrok mà không sửa IP. App mobile **không** có lớp proxy đó —
phải đặt `EXPO_PUBLIC_API_BASE` là URL tuyệt đối (emulator Android dùng
`http://10.0.2.2:8100`, **không phải** localhost).

Đại lý mẫu: `DL001` (Vàng, hạn mức lớn), `DL002` (Bạc, **đang vượt hạn mức** — dễ
thấy luồng chờ duyệt), `DL003` (Kim Cương).

## Kiểm tra

```bash
pnpm turbo run build       # 4 app
pnpm turbo run test        # 5 package
pnpm turbo run typecheck   # 7 package
pnpm turbo run lint        # 7 package
pnpm contracts:pull        # cập nhật openapi.json (backend Java phải đang chạy)
```

| Đường dẫn | Dùng để |
|---|---|
| `http://localhost:8100/openapi.json` | hợp đồng API |
| `http://localhost:8100/docs` | Swagger UI (**tắt ở production**) |

---

## Kiến trúc

Chi tiết: **[`docs/architecture.md`](docs/architecture.md)** —
§12 nói riêng về đơn lẻ và bot Facebook.

```
apps/web ──┐
           ├──► apps/api-java :8100 ──/api/assistant*──► apps/api :8101
apps/mobile┘         │        ▲                              │
                     │        └────────── bq_client ─────────┘
                     ▼
        ports/ ──┬── adapters/demo   (JSON + SQLite)
                 └── adapters/sapb1  (SAP Business One Service Layer)

Trang Facebook ──webhook──► apps/api :8101  app/bot/
                                  └──POST /api/retail/orders──► :8100
```

Đổi nguồn dữ liệu bằng **một biến môi trường** `BQ_DATA_SOURCE=demo|sapb1` —
không sửa controller, frontend hay mobile.

### Quyết định kiến trúc (ADR)

- [0001 — Cấu trúc monorepo](docs/adr/0001-monorepo-structure.md)
- [0002 — Hai backend: Python và Java](docs/adr/0002-backend-api-vs-api-java.md) 🟡 *chờ quyết định*

### Nối bot bán lẻ với Facebook

Code đã xong; phần còn lại là tạo Meta app, lấy token, đăng ký webhook và xin Meta
duyệt quyền `pages_messaging`. Từng bước kèm cách kiểm tra:
**[`docs/facebook-messenger-setup.md`](docs/facebook-messenger-setup.md)**.

> Bot **không bịa** phí ship hay chính sách đổi trả — chưa điền thì nó nói chưa biết
> và xin số điện thoại khách.

### Tài liệu nhị phân

Slide, video, bảng tính **lưu ngoài repo** — xem [`docs/README.md`](docs/README.md).

---

## Deploy

| Nền tảng | Deploy gì | Lọc |
|---|---|---|
| **Vercel** | `@bq/web` | `ignoreCommand: npx turbo-ignore @bq/web` |
| **Render** | `bq-api` (Docker, Java) | `buildFilter: apps/api-java/**` |
| **Render** | `bq-assistant` (Python) | `buildFilter: apps/api/**` |

> Khi đã nối SAP B1: Service Layer thường nằm trong mạng nội bộ của BQ. Cloud công
> cộng sẽ **không gọi tới được** — cần VPN, reverse proxy có TLS + IP allowlist,
> hoặc tự host (`apps/api-java/Dockerfile`). Đây là quyết định hạ tầng, chốt trước
> khi hứa ngày go-live.

# ADR 0001 — Cấu trúc monorepo

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-20
- **Áp dụng tại:** commit `8d7bd8f`

## Bối cảnh

Repo ban đầu có hai thư mục ngang cấp: `backend/` (FastAPI) và `frontend/` (Next.js).
Khi phát sinh thêm app di động, cấu trúc đó bộc lộ ba vấn đề:

1. **Kiểu dữ liệu và API client sẽ bị nhân đôi.** Web và mobile gọi cùng một API;
   nếu mỗi bên tự khai `interface Order`, hai bên sẽ lệch nhau mà không ai biết cho
   tới khi giao diện hỏng.
2. **Không có chỗ cho hợp đồng API.** Không nơi nào trong repo mô tả BE hứa trả về
   cái gì, nên mọi thay đổi backend đều là thay đổi ngầm.
3. **Tên thư mục mô tả công nghệ, không mô tả vai trò.** `backend/` không nói được
   rằng sau này sẽ có hai backend.

## Các lựa chọn đã cân nhắc

| Lựa chọn | Nhược điểm |
|---|---|
| **Giữ nguyên `backend/` + `frontend/`** | Không có chỗ đặt mobile và code dùng chung. |
| **Tách thành nhiều repo** | Thay đổi xuyên BE–FE cần nhiều PR; hợp đồng API khó giữ đồng bộ; quá nặng cho quy mô 1–2 người. |
| **Monorepo `apps/*` + `packages/*`** | Thêm một lớp tooling (workspace, pipeline, cấu hình deploy root). |

## Quyết định

Dùng **pnpm workspaces + Turborepo** với hai nhóm:

```
apps/        thứ chạy được và deploy được
  api        service trợ lý AI (Python/FastAPI)
  api-java   backend nghiệp vụ (Java/Spring Boot)
  web        Next.js — dashboard sale + app đại lý bản web
  mobile     React Native/Expo — app đại lý iOS + Android

packages/    thứ được app import, không tự chạy
  types      kiểu dữ liệu thuần, 0 dependency
  core       logic nghiệp vụ thuần (format tiền, vòng đời đơn, công nợ)
  api-client client gọi API, dùng chung web + mobile
  contracts  openapi.json — hợp đồng BE ⇄ FE
  tsconfig   cấu hình TypeScript dùng chung
```

Di chuyển bằng `git mv` để giữ lịch sử từng file.

## Hệ quả

**Tích cực**

- Kiểu dữ liệu và API client **chỉ còn một nguồn**. Web và mobile đều import
  `@bq/types` + `@bq/api-client`; mỗi app chỉ còn một lớp vỏ ~20–26 dòng.
- `packages/contracts` biến thay đổi hợp đồng API thành **diff đọc được trong PR**.
- Đổi backend không lan ra giao diện — xem [ADR 0002](0002-backend-api-vs-api-java.md).

**Tiêu cực**

- Cần `corepack enable pnpm` trước khi làm việc; `npm install` thuần sẽ hỏng.
- Vercel/Render phải trỏ đúng thư mục con; cấu hình cũ bị vỡ khi di chuyển.
- Turborepo chỉ điều phối được app có `package.json` **kèm script tương ứng** —
  hai backend hiện thiếu script nên `turbo run build` bỏ qua (xử lý ở Phase 3).

**Cố ý KHÔNG làm**

- **Không** tạo `packages/ui` dùng chung web + mobile. Web dùng Tailwind/DOM, mobile
  dùng primitive React Native; chia sẻ được chỉ khi thêm `react-native-web` — chi
  phí lớn hơn lợi ích ở quy mô hiện tại.

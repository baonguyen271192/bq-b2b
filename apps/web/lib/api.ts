/**
 * Lớp vỏ tương thích cho web.
 *
 * Kiểu dữ liệu, API client và logic nghiệp vụ đã chuyển sang `packages/*` để dùng
 * chung với `apps/mobile`. File này chỉ cấu hình client cho môi trường WEB rồi
 * re-export, nhờ vậy mọi `from "@/lib/api"` sẵn có vẫn chạy nguyên.
 *
 * Nguồn thật: packages/types, packages/api-client, packages/core.
 */
import { createApiClient } from "@bq/api-client";

export type * from "@bq/types";
export { ApiError } from "@bq/api-client";
export { nextActionLabel, retailNextActionLabel, vnd, totalPairs } from "@bq/core";

// Rỗng = gọi API cùng origin (đường dẫn tương đối) → Next rewrites proxy sang
// backend :8100. Nhờ vậy chạy được cả localhost lẫn tunnel (ngrok) mà không cần
// sửa IP. Chỉ đặt NEXT_PUBLIC_API_BASE khi muốn trỏ backend ở host khác.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export const api = createApiClient({ baseUrl: API_BASE });

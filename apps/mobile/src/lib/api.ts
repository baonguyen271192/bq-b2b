/**
 * Cấu hình API client cho MOBILE.
 *
 * Khác web: app native KHÔNG có lớp proxy nào (web dựa vào Next rewrites), nên
 * `baseUrl` bắt buộc là URL tuyệt đối, lấy từ EXPO_PUBLIC_API_BASE (xem .env.example).
 *
 * Kiểu dữ liệu và lời gọi API dùng CHUNG với web qua packages/* — sửa endpoint một
 * lần ở `packages/api-client`, cả hai app cùng nhận.
 */
import { createApiClient } from "@bq/api-client";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE;

if (!baseUrl) {
  // Fail nhanh và rõ: lỗi phổ biến nhất khi chạy trên máy thật/emulator là quên
  // đặt biến này, biểu hiện ra ngoài chỉ là "Network request failed" khó đoán.
  console.warn(
    "[BQ] Thiếu EXPO_PUBLIC_API_BASE — sao chép .env.example thành .env. " +
      "Emulator Android dùng http://10.0.2.2:8100 chứ không phải localhost.",
  );
}

export const api = createApiClient({ baseUrl: baseUrl ?? "http://localhost:8100" });

export type * from "@bq/types";
export { vnd, nextActionLabel, totalPairs } from "@bq/core";

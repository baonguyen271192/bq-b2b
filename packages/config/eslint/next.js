import next from "eslint-config-next";
import base from "./base.js";

/**
 * Dành cho `apps/web` (Next.js App Router).
 *
 * `eslint-config-next` mang theo rule riêng của Next: chặn <img> thường thay cho
 * next/image, chặn <a> cho điều hướng nội bộ, kiểm tra Hook của React. Đây là
 * những lỗi chỉ lộ ra lúc chạy thật hoặc khi đo Core Web Vitals.
 */
export default [
  ...base,
  ...next,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Next đã cấu hình sẵn các rule React/Hook; không ghi đè thêm ở đây.
    },
  },
];

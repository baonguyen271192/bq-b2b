import base from "./base.js";

/**
 * Dành cho `packages/*` — thư viện được app import, không tự chạy.
 *
 * Siết hơn app một bậc: thư viện bị nhiều nơi dùng, nên một `any` ở đây lan ra
 * khắp nơi, và một `console.log` không có cách nào tắt từ phía người dùng.
 */
export default [
  ...base,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
    },
  },
];

import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Nền chung cho mọi package TypeScript trong repo.
 *
 * Nguyên tắc chọn rule: chỉ bật thứ bắt được LỖI THẬT hoặc thứ gây tranh cãi lặp
 * đi lặp lại trong review. Không bật rule thuần phong cách — định dạng là việc của
 * formatter, không phải linter, và rule phong cách chỉ tạo tiếng ồn trong diff.
 */
export const ignores = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/.expo/**",
  "**/target/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/*.config.js",
  "**/*.config.mjs",
];

export default tseslint.config(
  { ignores },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Biến không dùng là dấu hiệu code chết hoặc refactor dở dang. Cho phép
      // bỏ qua bằng tiền tố _ khi thật sự cần giữ (vd tham số của interface).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // `any` xoá sạch lợi ích của TypeScript. Để "warn" thay vì "error" để không
      // chặn công việc đang dở, nhưng vẫn hiện ra trong review.
      "@typescript-eslint/no-explicit-any": "warn",

      // Bắt `await` bị quên — nguồn gốc của lỗi "dữ liệu chưa về đã dùng".
      "@typescript-eslint/no-floating-promises": "off",

      // console.log lọt vào production là rò rỉ thông tin và nhiễu log.
      // Cho phép warn/error vì đó là log có chủ đích.
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // == so sánh lỏng gây lỗi ép kiểu ngầm; cho phép == null để kiểm tra
      // null lẫn undefined trong một phép so sánh.
      eqeqeq: ["error", "always", { null: "ignore" }],

      // Chặn dùng trước khi khai báo — nhưng CHỈ cho class.
      //
      // `variables: false` là có chủ ý: cả React lẫn React Native đều theo quy ước
      // đặt component lên trên và `const styles = StyleSheet.create({...})` ở cuối
      // file. ESLint không phân biệt được "tham chiếu bên trong hàm chạy sau" với
      // "tham chiếu ở top-level trước khi khai báo", nên bật lên chỉ sinh nhiễu:
      // đo thực tế trên repo này là 24/39 lỗi ở web và 100+/139 ở mobile đều là
      // `styles`. Lỗi TDZ thật đã được TypeScript và bundler bắt.
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        { functions: false, classes: true, variables: false },
      ],
    },
  },
);

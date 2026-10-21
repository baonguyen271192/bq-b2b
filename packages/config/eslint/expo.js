import expo from "eslint-config-expo/flat.js";
import base from "./base.js";

/**
 * Dành cho `apps/mobile` (React Native / Expo).
 *
 * `eslint-config-expo/flat` biết môi trường React Native: global của RN, quy tắc
 * import của Metro, và các bẫy riêng của nền tảng. Lưu ý dùng bản `flat`, không
 * phải entry mặc định (bản cũ theo eslintrc).
 */
export default [
  ...base,
  ...expo,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // StyleSheet.create dùng object literal lớn; rule sắp xếp key chỉ gây nhiễu.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

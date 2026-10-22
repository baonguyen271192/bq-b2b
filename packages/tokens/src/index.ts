/**
 * Design token của BQ — TS thuần, KHÔNG phụ thuộc React hay React Native.
 *
 * Dùng chung cho `apps/mobile` và `apps/web`. Phần ánh xạ sang style của từng
 * nền tảng nằm ở phía tiêu thụ (`apps/mobile/src/theme.ts`), không nằm ở đây:
 * gói này nhét `StyleSheet` vào là web không dùng được nữa.
 */
export { color, type ColorToken } from "./colors";
export { space, radius, hitSize } from "./layout";
export {
  fontFamily,
  textStyle,
  type FontWeightToken,
  type TextStyleToken,
} from "./typography";
export { productSwatch } from "./product-swatch";

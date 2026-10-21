/**
 * Lớp ánh xạ design token sang React Native.
 *
 * Giá trị thật nằm ở `@bq/tokens` (TS thuần, dùng chung với web). File này CHỈ
 * biến chúng thành thứ RN hiểu được — và là nơi duy nhất được phép biết RN tồn
 * tại. Screen và component lấy mọi thứ từ đây.
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";
import {
  color,
  fontFamily,
  hitSize,
  radius,
  space,
  textStyle,
  type FontWeightToken,
  type TextStyleToken,
} from "@bq/tokens";

export { color, fontFamily, hitSize, radius, space, textStyle };
export type { FontWeightToken, TextStyleToken };

/**
 * Style chữ hoàn chỉnh cho RN.
 *
 * `weight` đi qua TÊN FONT chứ không qua `fontWeight`: Android bỏ qua
 * `fontWeight` khi dùng font tuỳ biến, nên khai số ở đó sẽ ra chữ mảnh trên
 * Android mà iOS vẫn đúng — lỗi chỉ lộ trên máy thật.
 */
export function text(
  token: TextStyleToken,
  opts?: { weight?: FontWeightToken; tabular?: boolean },
): TextStyle {
  const t = textStyle[token];
  return {
    fontFamily: fontFamily[opts?.weight ?? (t.weight as FontWeightToken)],
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    color: color.ink,
    // Khai một lần trong object literal: `fontVariant` của TextStyle là
    // ReadonlyArray nên gán sau khi tạo sẽ không biên dịch được.
    ...(opts?.tabular ? { fontVariant: ["tabular-nums"] as const } : null),
  };
}

/**
 * Bóng đổ CHỈ cho phần tử nổi (tab bar, dock đáy).
 *
 * Card thường không có shadow — tách khỏi nền bằng `paper` trên `canvas`. Rắc
 * shadow lên mọi card làm màn hình trông đục và mất cảm giác phân cấp.
 *
 * Khai cả `shadow*` (iOS) lẫn `elevation` (Android): thiếu một bên là một nền
 * tảng phẳng lì.
 */
export const shadow: Record<"float" | "dock", ViewStyle> = {
  float: {
    shadowColor: color.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dock: {
    shadowColor: color.ink,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
};

/** Gradient cam, chéo trên-trái → dưới-phải. Dùng cho CreditCard và splash. */
export const brandGradient = {
  colors: [color.bqBright, color.bq, color.bqDeep] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

/**
 * Vùng chạm tối thiểu 44. Dùng cho phần tử nhỏ hơn 44 về mặt thị giác.
 */
export function hitSlopFor(visualSize: number) {
  const pad = Math.max(0, Math.ceil((hitSize - visualSize) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
}

/**
 * Chữ trên nền cam `bq` chỉ đạt 3.56:1 → chỉ hợp lệ khi ≥ 15px và weight ≥ 600.
 * Hàm này để component tự kiểm tra thay vì tin người dùng component.
 */
export const onBrandTextIsLegible = (fontSize: number, weight: FontWeightToken) =>
  fontSize >= 15 && (weight === "semibold" || weight === "bold" || weight === "extrabold");

/** Android cắt chữ có lineHeight sát fontSize; cộng thêm 1px cho chắc. */
export const lineHeightFix = Platform.OS === "android" ? 1 : 0;

import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { color, text, type FontWeightToken, type TextStyleToken } from "@/theme";

export interface TProps extends Omit<TextProps, "style"> {
  /** Bậc trong thang chữ. Mặc định `body`. */
  variant?: TextStyleToken;
  /** Ghi đè weight của bậc chữ (vd `body` nhưng muốn đậm). */
  weight?: FontWeightToken;
  /** Màu chữ — chỉ nhận token màu, không nhận hex. */
  tone?: "ink" | "muted" | "white" | "brand" | "ok" | "warn" | "danger" | "info";
  style?: TextStyle | TextStyle[];
}

/**
 * `brand` trỏ tới `textBrand`, KHÔNG phải `brand` (SPEC mục 5.A): cam làm nền và
 * cam làm chữ là hai màu khác nhau. Ánh xạ ở đây để không chỗ nào đặt được chữ
 * cam 4.19:1 lên nền sáng.
 */
export const TONE = {
  ink: color.ink, muted: color.muted, white: color.white,
  brand: color.textBrand, ok: color.ok, warn: color.warn,
  danger: color.danger, info: color.info,
} as const;

/**
 * Chữ theo token. Dùng THAY CHO `Text` của react-native ở mọi nơi.
 * Khác {@link Num}: không bật tabular-nums, nên không dùng cho số liệu xếp cột.
 */
export function T({ variant = "body", weight, tone = "ink", style, ...rest }: TProps) {
  return <RNText style={[text(variant, { weight }), { color: TONE[tone] }, style]} {...rest} />;
}

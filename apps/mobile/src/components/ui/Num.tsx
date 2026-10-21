import { Text as RNText } from "react-native";
import { color, text } from "@/theme";
import type { TProps } from "./T";

const TONE = {
  ink: color.ink, muted: color.muted, faint: color.faint, white: color.white,
  bq: color.bq, ok: color.ok, warn: color.warn, danger: color.danger, info: color.info,
} as const;

/**
 * Chữ SỐ: bật `tabular-nums` nên mọi chữ số rộng bằng nhau.
 * Dùng cho tiền, số lượng, số tồn — bất cứ chỗ nào số nằm chồng cột hoặc thay
 * đổi liên tục. Khác {@link T}: chữ thường dùng T, số dùng Num.
 */
export function Num({ variant = "body", weight, tone = "ink", style, ...rest }: TProps) {
  return (
    <RNText
      style={[text(variant, { weight, tabular: true }), { color: TONE[tone] }, style]}
      {...rest}
    />
  );
}

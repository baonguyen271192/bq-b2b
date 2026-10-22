import { Text as RNText } from "react-native";
import { text } from "@/theme";
import { TONE, type TProps } from "./T";

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

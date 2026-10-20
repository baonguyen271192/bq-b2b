import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, fontForWeight, type as scale } from "./tokens";

type Variant = keyof typeof scale;

export interface BqTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  /** Đè độ đậm mà vẫn giữ đúng file font (RN Android không tự chọn weight). */
  weight?: "400" | "500" | "600" | "700" | "800";
  center?: boolean;
}

/**
 * Chữ của app. Luôn dùng component này thay cho `Text` của React Native.
 *
 * Lý do: (1) buộc đi qua thang chữ, (2) ánh xạ `fontWeight` sang đúng file font —
 * Android bỏ qua fontWeight khi dùng font tuỳ biến, nên `fontWeight: "700"` trên
 * Inter sẽ ra chữ mảnh nếu không chỉ đúng tên font.
 */
export function Text({
  variant = "body",
  color = colors.text,
  weight,
  center,
  style,
  ...rest
}: BqTextProps) {
  const base = scale[variant];
  const finalWeight = weight ?? (base.fontWeight as string);

  const resolved: TextStyle = {
    fontSize: base.fontSize,
    lineHeight: base.lineHeight,
    fontFamily: fontForWeight[finalWeight],
    color,
    ...(center ? { textAlign: "center" } : null),
  };

  return <RNText {...rest} style={[resolved, style]} />;
}

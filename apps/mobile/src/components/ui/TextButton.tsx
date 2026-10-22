import { useState } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { hitSlopFor } from "@/theme";
import { T } from "./T";

export interface TextButtonProps {
  label: string;
  onPress?: () => void;
  /** `danger` cho "Xoá". `brand` cho link cam trên nền sáng. */
  tone?: "ink" | "brand" | "danger";
  /** Gạch chân — dùng cho link trong luồng ("Sửa size", "+1 mỗi size"). */
  underline?: boolean;
  style?: ViewStyle;
}

/**
 * Nút chỉ có chữ, không nền không viền: "Đặt mặc định", "Sửa size", "Xem tất cả".
 *
 * Vùng chạm nới lên 44 bằng `hitSlop` chứ không bằng padding: thêm padding sẽ
 * đẩy chữ lệch khỏi hàng nó đang căn theo.
 */
export function TextButton({ label, onPress, tone = "ink", underline, style }: TextButtonProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      hitSlop={hitSlopFor(20)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[down && styles.down, style]}
    >
      <T variant="label" weight="semibold" tone={tone} style={underline ? styles.underline : undefined}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  down: { opacity: 0.6 },
  underline: { textDecorationLine: "underline" },
});

import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface ChipProps {
  label: string;
  /** Đang được chọn — nền ink, chữ trắng. */
  active?: boolean;
  onPress?: () => void;
  /** `brand` cho nhãn thông tin (hạng đại lý): nền bqTint, chữ ink. */
  tone?: "select" | "brand" | "neutral";
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Chip lọc/danh mục, hoặc nhãn thông tin khi không có `onPress`.
 * Khác {@link StatusTag}: Chip để CHỌN; StatusTag chỉ hiển thị trạng thái đơn.
 */
export function Chip({ label, active, onPress, tone = "select", accessibilityLabel, style }: ChipProps) {
  const bg =
    tone === "brand" ? color.bqTint
    : active ? color.ink
    : color.paper;
  const textTone = active && tone === "select" ? "white" : "ink";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={onPress ? { selected: !!active } : undefined}
      style={[
        styles.base,
        { backgroundColor: bg },
        tone !== "brand" && !active && styles.border,
        style,
      ]}
    >
      <T variant="small" weight="semibold" tone={textTone}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 36, paddingHorizontal: space.x4, borderRadius: radius.chip,
    alignItems: "center", justifyContent: "center",
  },
  border: { borderWidth: 1, borderColor: color.line },
});

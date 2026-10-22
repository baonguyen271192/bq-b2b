import { useState } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface DashedButtonProps {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

/**
 * Nút viền NÉT ĐỨT — "Thêm địa chỉ mới", "Thêm ảnh" (SPEC §2).
 *
 * Nét đứt là tín hiệu "chỗ này còn trống, thêm vào đây", khác hẳn nút viền liền
 * của {@link Pill} tone `outline` vốn là một hành động phụ trên thứ đã có.
 */
export function DashedButton({ label, onPress, icon = "add", style }: DashedButtonProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, down && styles.down, style]}
    >
      <Ionicons name={icon} size={20} color={color.ink} />
      <T variant="bodyStrong" weight="semibold" tone="ink">{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56, borderRadius: radius.option, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: space.x2,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: color.ink,
  },
  down: { transform: [{ scale: 0.98 }] },
});

import { useState } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface DashedButtonProps {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * `row` — nút ngang cao 56 ("Thêm địa chỉ mới").
   * `tile` — ô vuông 96 ("Thêm ảnh" ở màn Đăng ký), icon trên chữ dưới.
   */
  shape?: "row" | "tile";
  style?: ViewStyle;
}

/**
 * Nút viền NÉT ĐỨT — "Thêm địa chỉ mới", "Thêm ảnh" (SPEC §2).
 *
 * Nét đứt là tín hiệu "chỗ này còn trống, thêm vào đây", khác hẳn nút viền liền
 * của {@link Pill} tone `outline` vốn là một hành động phụ trên thứ đã có.
 */
export function DashedButton({ label, onPress, icon = "add", shape = "row", style }: DashedButtonProps) {
  const [down, setDown] = useState(false);
  const tile = shape === "tile";
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, tile ? styles.tile : styles.row, down && styles.down, style]}
    >
      <Ionicons name={icon} size={tile ? 24 : 20} color={color.ink} />
      <T variant={tile ? "chip" : "bodyStrong"} weight="semibold" tone="ink">{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.option, alignItems: "center", justifyContent: "center",
    gap: space.x2, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.ink,
  },
  row: { height: 56, flexDirection: "row" },
  tile: { width: 96, height: 96, borderRadius: radius.field },
  down: { transform: [{ scale: 0.98 }] },
});

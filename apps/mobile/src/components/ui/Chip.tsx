import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, hitSlopFor, radius, space } from "@/theme";
import { T } from "./T";

export interface ChipProps {
  label: string;
  /** Đang chọn — nền ink, chữ trắng (chip danh mục). */
  selected?: boolean;
  onPress?: () => void;
  /**
   * `category` cao 40 (hàng danh mục) · `filter` cao 36 (hàng lọc nhanh) ·
   * `applied` nền tint chữ brandDeep, kèm × (bộ lọc đang áp dụng).
   */
  variant?: "category" | "filter" | "applied";
  /** Hiện chevron xuống — chip mở sheet chọn ("Bán chạy ˅"). */
  dropdown?: boolean;
  /** Hiện nút × — bỏ bộ lọc này. Chỉ dùng với `applied`. */
  onRemove?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Chip lọc / danh mục (SPEC §3.3).
 *
 * Nút × là `Pressable` RIÊNG lồng bên trong, nên chạm vào × không kích hoạt
 * `onPress` của chip: bỏ một bộ lọc và mở lại nó là hai ý định khác nhau.
 *
 * Khác {@link StatusTag}: Chip để CHỌN; StatusTag chỉ hiển thị trạng thái.
 */
export function Chip({
  label, selected, onPress, variant = "category", dropdown, onRemove,
  accessibilityLabel, style,
}: ChipProps) {
  const [down, setDown] = useState(false);
  const applied = variant === "applied";
  const tone = applied ? "brand" : selected ? "white" : "ink";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      // SPEC cho chip lọc cao 36 nhưng cũng đòi vùng chạm tối thiểu 44 —
      // hai yêu cầu đó chỉ sống chung được bằng hitSlop.
      hitSlop={variant === "category" ? undefined : hitSlopFor(36)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.base,
        variant === "category" ? styles.category : styles.compact,
        applied ? styles.applied : selected ? styles.on : styles.off,
        down && styles.down,
        style,
      ]}
    >
      <T variant="label" weight="semibold" tone={tone} numberOfLines={1}>{label}</T>
      {dropdown ? <Ionicons name="chevron-down" size={14} color={color.ink} /> : null}
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={hitSlopFor(16)}
          accessibilityRole="button"
          accessibilityLabel={`Bỏ lọc ${label}`}
        >
          <Ionicons name="close" size={14} color={color.textBrand} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** Dải mờ dần ở mép phải hàng chip cuộn ngang — báo "còn nữa bên phải". */
export function ChipFade({ style }: { style?: ViewStyle }) {
  return <View style={[styles.fade, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    paddingHorizontal: space.x4, borderRadius: radius.pill,
  },
  category: { height: 40 },
  compact: { height: 36 },
  on: { backgroundColor: color.ink },
  off: { backgroundColor: color.paper, borderWidth: 1, borderColor: color.line },
  applied: { backgroundColor: color.tint },
  down: { opacity: 0.75 },
  fade: { position: "absolute", right: 0, top: 0, bottom: 0, width: 40 },
});

import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, hitSlopFor, radius, space } from "@/theme";
import { Num } from "./Num";

export type IconButtonTone = "light" | "glass" | "dark" | "brand";

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** `glass` dùng khi nút nằm ĐÈ LÊN ẢNH — nền trắng mờ để icon tách khỏi ảnh. */
  tone?: IconButtonTone;
  /** Số hiện trong badge cam góc trên phải. 0 hoặc bỏ trống = không hiện. */
  badge?: number;
  disabled?: boolean;
  /** BẮT BUỘC: nút chỉ có icon thì trình đọc màn hình không có gì để đọc. */
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * Nút tròn 44 chỉ chứa icon.
 * Khác {@link Pill}: không có nhãn chữ, nên `accessibilityLabel` là bắt buộc.
 */
export function IconButton({
  icon, onPress, tone = "light", badge, disabled, accessibilityLabel, style,
}: IconButtonProps) {
  const [down, setDown] = useState(false);
  const bg =
    tone === "glass" ? color.whiteA(0.9)
    : tone === "dark" ? color.ink
    : tone === "brand" ? color.brand
    : color.paper;
  const fg = tone === "dark" || tone === "brand" ? color.white : color.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      hitSlop={hitSlopFor(44)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.base,
        { backgroundColor: bg },
        tone === "light" && styles.border,
        disabled && styles.disabled,
        down && styles.down,
        style,
      ]}
    >
      <Ionicons name={icon} size={20} color={fg} />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Num variant="badge" tone="white">{badge > 99 ? "99+" : badge}</Num>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44, height: 44, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  border: { borderWidth: 1, borderColor: color.line },
  disabled: { opacity: 0.4 },
  /** SPEC §4: IconButton nhấn xuống scale 0.94 (sâu hơn Pill vì nút nhỏ). */
  down: { transform: [{ scale: 0.94 }] },
  badge: {
    position: "absolute", top: -4, right: -4, minWidth: 20, height: 20,
    paddingHorizontal: space.x1, borderRadius: radius.pill,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
    // Viền cùng màu nền màn hình để badge tách khỏi icon bên dưới.
    borderWidth: 2, borderColor: color.canvas,
  },
});

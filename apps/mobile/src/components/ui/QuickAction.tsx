import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { Badge } from "./Badge";
import { T } from "./T";

export interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  /** `ink` cho hành động CHÍNH — chỉ MỘT ô trong hàng được dùng (SPEC §3.2). */
  tone?: "paper" | "ink";
  /** Số hiện ở góc trên phải. 0 hoặc bỏ trống = không hiện. */
  badge?: number;
  style?: ViewStyle;
}

/**
 * Ô thao tác nhanh cao 88 ở Trang chủ (SPEC §2).
 *
 * Ô chính dùng nền INK chứ không nền cam: hàng này nằm ngay dưới thẻ hạn mức
 * vốn đã là một mảng cam lớn, thêm một ô cam nữa thì cả hai cùng mất trọng số.
 */
export function QuickAction({
  icon, label, onPress, tone = "paper", badge, style,
}: QuickActionProps) {
  const [down, setDown] = useState(false);
  const dark = tone === "ink";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} mục` : label}
      style={[styles.tile, dark ? styles.ink : styles.paper, down && styles.down, style]}
    >
      <View style={[styles.circle, { backgroundColor: dark ? color.whiteA(0.14) : color.subtle }]}>
        <Ionicons name={icon} size={20} color={dark ? color.white : color.ink} />
      </View>
      <T variant="chip" weight="semibold" tone={dark ? "white" : "ink"} numberOfLines={1}>
        {label}
      </T>
      {badge ? (
        <Badge count={badge} ringColor={dark ? "ink" : "paper"} style={styles.badge} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1, flexBasis: 0, height: 88,
    borderRadius: radius.action, alignItems: "center", justifyContent: "center",
    gap: space.x2, paddingHorizontal: space.x2,
  },
  circle: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  paper: { backgroundColor: color.paper },
  ink: { backgroundColor: color.ink },
  down: { transform: [{ scale: 0.98 }] },
  badge: { position: "absolute", top: space.x2, right: space.x2 },
});

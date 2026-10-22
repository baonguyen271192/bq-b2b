import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export type NotificationTone = "shipping" | "pending" | "due" | "paid" | "invoice";

export interface NotificationRowProps {
  tone: NotificationTone;
  title: string;
  body: string;
  /** "10 phút trước", "Hôm qua", "14/10/2026". */
  at: string;
  read?: boolean;
  onPress?: () => void;
  divider?: boolean;
  style?: ViewStyle;
}

const TONE: Record<NotificationTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  shipping: { bg: color.infoTint, fg: color.info, icon: "car-outline" },
  pending: { bg: color.warnTint, fg: color.warn, icon: "information-circle-outline" },
  due: { bg: color.tint, fg: color.textBrand, icon: "calendar-outline" },
  paid: { bg: color.okTint, fg: color.ok, icon: "checkmark-outline" },
  invoice: { bg: color.subtle, fg: color.muted, icon: "receipt-outline" },
};

/**
 * Một dòng thông báo (SPEC §3.20).
 *
 * Chưa đọc được đánh dấu bằng CẢ weight đậm hơn lẫn chấm cam, không chỉ chấm:
 * một chấm 8px là tín hiệu quá nhỏ để là thứ duy nhất phân biệt hai trạng thái.
 */
export function NotificationRow({
  tone, title, body, at, read, onPress, divider, style,
}: NotificationRowProps) {
  const [down, setDown] = useState(false);
  const t = TONE[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={`${read ? "" : "Chưa đọc. "}${title}. ${body}. ${at}`}
      style={[styles.row, divider && styles.divider, down && styles.down, style]}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={t.icon} size={20} color={t.fg} />
      </View>
      <View style={styles.text}>
        <T variant="bodyStrong" weight={read ? "semibold" : "bold"} numberOfLines={2}>{title}</T>
        <T variant="small" tone="muted">{body}</T>
        <T variant="small" tone="muted">{at}</T>
      </View>
      {read ? null : <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.x3, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  icon: {
    width: 40, height: 40, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  text: { flex: 1, gap: 1 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: color.brand, marginTop: space.x2 },
  down: { opacity: 0.6 },
});

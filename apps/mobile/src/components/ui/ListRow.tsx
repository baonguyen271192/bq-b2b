import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Nội dung bên phải thay cho chevron, vd StatusTag hoặc số tiền. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Dòng nguy hiểm (đăng xuất, xoá) — chữ và icon màu danger. */
  danger?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Một dòng trong danh sách: icon + tiêu đề + phụ đề + chevron.
 * Dùng cho màn Hồ sơ, danh sách cài đặt, danh sách hoá đơn.
 */
export function ListRow({
  title, subtitle, icon, trailing, onPress, danger, accessibilityLabel, style,
}: ListRowProps) {
  const [down, setDown] = useState(false);
  const tone = danger ? "danger" : "ink";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.row, down && styles.down, style]}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={danger ? color.danger : color.muted} />
        </View>
      ) : null}
      <View style={styles.body}>
        <T variant="bodyStrong" tone={tone}>{title}</T>
        {subtitle ? <T variant="small" tone="muted">{subtitle}</T> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={color.faint} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    // 56 > 44: dòng danh sách cần thoáng hơn ngưỡng chạm tối thiểu.
    minHeight: 56, paddingHorizontal: space.x4, paddingVertical: space.x3,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.chip, backgroundColor: color.canvas,
    alignItems: "center", justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  down: { backgroundColor: color.canvas },
});

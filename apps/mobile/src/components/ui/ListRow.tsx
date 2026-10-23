import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface ListRowProps {
  title: string;
  /**
   * Phụ đề 13 muted. Nhận `ReactNode` để chỗ gọi tự chọn kiểu chữ khi cần — vd
   * số điện thoại dùng `Num` cho chữ số thẳng cột (SPEC §5-M.3).
   */
  subtitle?: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Nội dung bên phải thay cho chevron, vd `Switch`, `StatusTag`, số tiền. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Dòng nguy hiểm (đăng xuất, xoá) — chữ và icon màu danger. */
  danger?: boolean;
  /** Kẻ divider phía DƯỚI. Dòng cuối trong card thì để false. */
  divider?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Một dòng trong card danh sách (SPEC §2): icon tròn 40 + tiêu đề + phụ đề + chevron.
 *
 * Divider do NGƯỜI GỌI bật, không tự suy: component không biết mình có phải
 * dòng cuối không, và tự vẽ rồi che đi bằng overflow là cách làm dễ vỡ khi card
 * đổi bo góc.
 */
export function ListRow({
  title, subtitle, icon, trailing, onPress, danger, divider, accessibilityLabel, style,
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
      style={[styles.row, divider && styles.divider, down && styles.down, style]}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={danger ? color.danger : color.ink} />
        </View>
      ) : null}
      <View style={styles.body}>
        <T variant="bodyStrong" weight="semibold" tone={tone}>{title}</T>
        {typeof subtitle === "string"
          ? <T variant="small" tone="muted">{subtitle}</T>
          : subtitle}
      </View>
      {trailing ?? (onPress
        ? <Ionicons name="chevron-forward" size={18} color={color.muted} />
        : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    paddingVertical: 14, minHeight: 44,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  down: { opacity: 0.6 },
});

import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { Pill } from "./Pill";
import { T } from "./T";

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  /** PHẢI nói người dùng cần làm gì tiếp theo, không chỉ mô tả cái rỗng. */
  hint: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

/**
 * Trạng thái rỗng. `hint` là bắt buộc và phải là HƯỚNG DẪN HÀNH ĐỘNG —
 * "Chưa có đơn nào" không giúp gì; "Chọn mẫu ở tab Sản phẩm để tạo đơn" thì có.
 */
export function EmptyState({
  icon = "cube-outline", title, hint, actionLabel, onActionPress, style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={color.faint} />
      </View>
      <T variant="heading" style={styles.center}>{title}</T>
      <T variant="body" tone="muted" style={styles.center}>{hint}</T>
      {actionLabel ? (
        <Pill label={actionLabel} onPress={onActionPress} tone="brand" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: space.x12, gap: space.x2 },
  iconWrap: {
    width: 72, height: 72, borderRadius: radius.pill, backgroundColor: color.canvas,
    alignItems: "center", justifyContent: "center", marginBottom: space.x2,
  },
  center: { textAlign: "center" },
  action: { marginTop: space.x4, alignSelf: "stretch" },
});

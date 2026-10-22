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
  /**
   * `ok` cho trạng thái THÀNH CÔNG (đã gửi đơn, đã gửi đăng ký): vòng tròn
   * `okTint`, icon `ok`. Mặc định là trung tính — phần lớn empty state là "chưa
   * có gì", không phải tin vui.
   */
  tone?: "neutral" | "ok";
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

/**
 * Trạng thái rỗng. `hint` là bắt buộc và phải là HƯỚNG DẪN HÀNH ĐỘNG —
 * "Chưa có đơn nào" không giúp gì; "Chọn mẫu ở tab Sản phẩm để tạo đơn" thì có.
 */
export function EmptyState({
  icon = "cube-outline", title, hint, tone = "neutral", actionLabel, onActionPress, style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconWrap, tone === "ok" && styles.iconOk]}>
        <Ionicons name={icon} size={28} color={tone === "ok" ? color.ok : color.muted} />
      </View>
      <T variant="section" style={styles.center}>{title}</T>
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
  iconOk: { backgroundColor: color.okTint },
  center: { textAlign: "center" },
  action: { marginTop: space.x4, alignSelf: "stretch" },
});

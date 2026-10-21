import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export type StatusKind = "ok" | "warn" | "info" | "danger" | "neutral";

export interface StatusTagProps {
  label: string;
  kind?: StatusKind;
  style?: ViewStyle;
}

const KIND = {
  ok: { dot: color.ok, bg: color.okTint },
  warn: { dot: color.warn, bg: color.warnTint },
  info: { dot: color.info, bg: color.infoTint },
  danger: { dot: color.danger, bg: color.dangerTint },
  neutral: { dot: color.muted, bg: color.canvas },
} as const;

/**
 * Chấm màu + chữ trên nền tint — trạng thái đơn hàng, hoá đơn.
 * Chỉ hiển thị, không bấm được. Cần bấm thì dùng {@link Chip}.
 */
export function StatusTag({ label, kind = "neutral", style }: StatusTagProps) {
  const k = KIND[kind];
  return (
    <View style={[styles.base, { backgroundColor: k.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: k.dot }]} />
      <T variant="micro" tone="ink">{label}</T>
    </View>
  );
}

/**
 * Trạng thái đơn/hoá đơn (chuỗi tiếng Việt từ backend) -> màu.
 *
 * So khớp CÓ DẤU CÁCH quanh từ khoá ở những chỗ dễ trùng: "huỷ" là khúc đầu của
 * "huỷ bỏ" nhưng cũng nằm trong "chờ huỷ" — mà hai cái đó khác nghĩa. Đã có lần
 * lọt lỗi kiểu này nên giữ danh sách đầy đủ thay vì rút gọn bằng `includes`.
 */
export function statusKindFor(status: string): StatusKind {
  const s = status.toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("từ chối")) return "danger";
  if (s.includes("vượt hạn mức") || s.includes("chờ duyệt")) return "warn";
  if (s.includes("đã nhận") || s.includes("hoàn tất")) return "ok";
  if (s.includes("giao") || s.includes("đóng gói")) return "info";
  return "neutral";
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    height: 26, paddingHorizontal: space.x3, borderRadius: radius.chip,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
});

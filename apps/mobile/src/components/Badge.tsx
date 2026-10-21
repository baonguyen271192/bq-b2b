import { StyleSheet, View } from "react-native";
import { Text, colors, radius, space } from "@/theme";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONES = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  neutral: colors.neutral,
  brand: { fg: colors.brand[500], bg: colors.brand.tint, border: colors.brand.ring },
} as const;

/**
 * Nhãn trạng thái. Luôn có viền mảnh cùng tông: nền nhạt không thôi thì ở ngoài nắng
 * gần như biến mất — điện thoại dùng ngoài cửa hàng, không phải trong văn phòng.
 */
export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text variant="caption" weight="600" color={t.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Suy tông màu từ chuỗi trạng thái do backend trả về (tiếng Việt, không phải enum). */
export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("từ chối")) return "danger";
  if (s.includes("vượt hạn mức") || s.includes("chờ duyệt")) return "warning";
  if (s.includes("đã nhận") || s.includes("hoàn tất")) return "success";
  if (s.includes("giao") || s.includes("đóng gói")) return "info";
  return "neutral";
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});

import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";

export interface CardProps {
  children: React.ReactNode;
  /** `flat` không padding — dùng khi con tự quản lề (vd list có hairline). */
  variant?: "padded" | "flat";
  style?: ViewStyle;
}

/**
 * Khối nội dung nền trắng trên nền canvas.
 * CỐ Ý KHÔNG CÓ SHADOW: tách khỏi nền bằng tương phản paper/canvas. Shadow chỉ
 * dành cho phần tử nổi (TabBar, Dock) — rắc lên mọi card làm mất phân cấp.
 */
export function Card({ children, variant = "padded", style }: CardProps) {
  return <View style={[styles.base, variant === "padded" && styles.padded, style]}>{children}</View>;
}

/** Đường kẻ ngăn giữa các dòng trong một Card. */
export function CardDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.paper, borderRadius: radius.card, overflow: "hidden" },
  padded: { padding: space.x4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
});

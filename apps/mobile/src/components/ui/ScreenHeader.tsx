import { StyleSheet, View, type ViewStyle } from "react-native";
import { space } from "@/theme";
import { T } from "./T";

export interface ScreenHeaderProps {
  title: string;
  /** Dòng nhỏ phía TRÊN tiêu đề, vd "Xin chào,". */
  eyebrow?: string;
  /** Dòng nhỏ phía DƯỚI tiêu đề. */
  caption?: string;
  /** Nút hoặc chip bên phải. */
  trailing?: React.ReactNode;
  /** `display` cho tiêu đề trang chính, `title` cho trang phụ. */
  size?: "display" | "title";
  style?: ViewStyle;
}

/** Tiêu đề đầu màn hình, trên nền canvas sáng (không phủ màu cả mảng). */
export function ScreenHeader({
  title, eyebrow, caption, trailing, size = "display", style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        {eyebrow ? <T variant="small" tone="muted">{eyebrow}</T> : null}
        <T variant={size}>{title}</T>
        {caption ? <T variant="small" tone="muted">{caption}</T> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.x3 },
  text: { flex: 1, gap: space.x1 },
  trailing: { flexDirection: "row", alignItems: "center", gap: space.x2, paddingTop: space.x1 },
});

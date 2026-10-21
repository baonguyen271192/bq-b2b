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
  /** `onBrand` khi tiêu đề nằm trên mảng cam — xem chú thích ở component. */
  tone?: "ink" | "onBrand";
  style?: ViewStyle;
}

/**
 * Tiêu đề đầu màn hình.
 *
 * `tone="onBrand"` KHÔNG chỉ đổi màu chữ: dòng phụ phải lên `bodyStrong` thay
 * vì `small`. Chữ trắng trên nền `bq` chỉ đạt 3.56:1, hợp lệ khi và chỉ khi cỡ
 * ≥ 15px và weight ≥ 600 (xem `onBrandTextIsLegible` ở theme.ts). `small` là
 * 13px/medium nên đặt lên nền cam là vi phạm tương phản.
 */
export function ScreenHeader({
  title, eyebrow, caption, trailing, size = "display", tone = "ink", style,
}: ScreenHeaderProps) {
  const onBrand = tone === "onBrand";
  const subVariant = onBrand ? "bodyStrong" : "small";
  const subTone = onBrand ? "white" : "muted";
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        {eyebrow ? <T variant={subVariant} tone={subTone}>{eyebrow}</T> : null}
        <T variant={size} tone={onBrand ? "white" : "ink"} numberOfLines={2}>{title}</T>
        {caption ? <T variant={subVariant} tone={subTone}>{caption}</T> : null}
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

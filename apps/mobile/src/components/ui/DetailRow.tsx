import { StyleSheet, View, type ViewStyle } from "react-native";
import { space } from "@/theme";
import { T } from "./T";

export interface DetailRowProps {
  label: string;
  /** Chuỗi, hoặc `<Price>` khi là số tiền. */
  value: React.ReactNode;
  /** Dòng tổng kết — nhãn và giá trị đậm hơn. */
  strong?: boolean;
  style?: ViewStyle;
}

/** Một dòng nhãn — giá trị trong thẻ tóm tắt (bảng giá trị đơn, thông tin giao). */
export function DetailRow({ label, value, strong, style }: DetailRowProps) {
  return (
    <View style={[styles.row, style]}>
      <T variant={strong ? "bodyStrong" : "small"} tone={strong ? "ink" : "muted"}>{label}</T>
      <View style={styles.value}>
        {typeof value === "string"
          ? <T variant={strong ? "bodyStrong" : "small"} style={styles.right}>{value}</T>
          : value}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x4, paddingVertical: space.x1,
  },
  // Giá trị co giãn và căn phải: địa chỉ kho dài sẽ xuống dòng trong phần của
  // nó thay vì đẩy nhãn ra khỏi hàng.
  value: { flex: 1, alignItems: "flex-end" },
  right: { textAlign: "right" },
});

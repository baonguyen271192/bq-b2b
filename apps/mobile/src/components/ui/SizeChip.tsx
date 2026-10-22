import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { Num, T } from "./";

export interface SizeChipProps {
  size: string | number;
  qty: number;
  style?: ViewStyle;
}

/**
 * Chip "39 ×8" — một size kèm số đôi, chỉ hiển thị (SPEC §2).
 *
 * Dùng ở giỏ hàng, chi tiết đơn, đơn nháp và card đơn do AI tạo: những chỗ cần
 * nhắc lại bảng size đã chọn mà không cho sửa tại chỗ. Sửa được thì dùng
 * `SizeRow`.
 *
 * Đây là một trong hai chỗ duy nhất được phép dùng chữ 12 (SPEC mục 5.B): số đôi
 * đã hiện ở dòng tổng của card nên chip chỉ là chi tiết bổ trợ.
 */
export function SizeChip({ size, qty, style }: SizeChipProps) {
  return (
    <View style={[styles.base, style]} accessibilityLabel={`Size ${size}, ${qty} đôi`}>
      <T variant="chip" weight="semibold" tone="muted">{size}</T>
      <Num variant="chip" weight="bold" tone="ink">{`×${qty}`}</Num>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row", alignItems: "center", gap: space.x1,
    height: 26, paddingHorizontal: 9, borderRadius: radius.chip,
    backgroundColor: color.subtle,
  },
});

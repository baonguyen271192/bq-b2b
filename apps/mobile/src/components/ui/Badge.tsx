import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { Num } from "./Num";

export interface BadgeProps {
  count: number;
  /** Nền viền theo màu nền phía sau để badge không dính vào nội dung. */
  ringColor?: "canvas" | "paper" | "ink";
  style?: ViewStyle;
}

/**
 * Chấm số đếm (giỏ hàng, thông báo).
 * Khác {@link StatusTag}: Badge chỉ có SỐ, StatusTag có chấm + chữ trạng thái.
 */
export function Badge({ count, ringColor = "canvas", style }: BadgeProps) {
  if (count <= 0) return null;
  const ring =
    ringColor === "paper" ? color.paper : ringColor === "ink" ? color.ink : color.canvas;
  return (
    <View style={[styles.base, { borderColor: ring }, style]}>
      <Num variant="badge" tone="white">{count > 99 ? "99+" : count}</Num>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 20, height: 20, paddingHorizontal: space.x1,
    borderRadius: radius.pill, backgroundColor: color.brand,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
});

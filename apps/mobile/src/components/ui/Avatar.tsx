import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius } from "@/theme";
import { T } from "./T";

export interface AvatarProps {
  /** Lấy chữ cái đầu làm nội dung. */
  name: string;
  style?: ViewStyle;
}

/**
 * Vòng tròn chữ cái đầu, nền cam.
 *
 * Chữ dùng bậc `title` (24px/bold) chứ không nhỏ hơn: trắng trên nền `bq` chỉ
 * đạt 3.56:1, hợp lệ khi và chỉ khi >= 15px và weight >= 600.
 */
export function Avatar({ name, style }: AvatarProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <View style={[styles.wrap, style]} accessible accessibilityLabel={name}>
      <T variant="title" tone="white">{initial}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 56, height: 56, borderRadius: radius.pill, backgroundColor: color.bq,
    alignItems: "center", justifyContent: "center",
  },
});

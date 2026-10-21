import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, shadow, space } from "@/theme";

export interface DockProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Thanh hành động cố định ở đáy màn hình (chi tiết sản phẩm, giỏ hàng).
 * Bo 2 góc TRÊN, có shadow hướng lên. Nội dung cuộn phía trên phải chừa
 * paddingBottom ít nhất bằng {@link DOCK_CLEARANCE} + safe area.
 */
export function Dock({ children, style }: DockProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + space.x3 }, shadow.dock, style]}>
      {children}
    </View>
  );
}

/** Chiều cao Dock ước tính, chưa gồm safe area — dùng để tính paddingBottom. */
export const DOCK_CLEARANCE = 136;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    paddingHorizontal: space.screen, paddingTop: space.x4,
    gap: space.x3,
  },
});

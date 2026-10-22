import { useEffect, useMemo } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { color, hitSlopFor, radius, shadow, space } from "@/theme";
import { T } from "./T";

export interface ToastProps {
  /** Nội dung. `null` = không hiện. Đổi chuỗi sẽ chạy lại hoạt cảnh. */
  message: string | null;
  onHide: () => void;
  /** Nút bên phải, vd "Xem giỏ". */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Tự ẩn sau bấy nhiêu. */
  durationMs?: number;
}

/**
 * Thông báo thoáng neo đáy màn.
 *
 * Tự ẩn nhưng KHÔNG mang thông tin nào chỉ xuất hiện ở đây: người dùng có thể
 * đang nhìn chỗ khác lúc nó hiện. "Đã thêm 12 đôi" chỉ xác nhận lại việc vừa
 * làm; con số thật nằm ở badge giỏ hàng và trong màn giỏ.
 */
export function Toast({
  message, onHide, actionLabel, onActionPress, durationMs = 3200,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const v = useMemo(() => ({ y: new Animated.Value(40), o: new Animated.Value(0) }), []);

  useEffect(() => {
    if (!message) return;
    v.y.setValue(40);
    v.o.setValue(0);
    Animated.parallel([
      Animated.timing(v.y, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(v.o, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(v.o, { toValue: 0, duration: 200, useNativeDriver: true }).start(onHide);
    }, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, v, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + space.x5, opacity: v.o, transform: [{ translateY: v.y }] },
      ]}
    >
      <View style={styles.bar}>
        <Ionicons name="checkmark-circle" size={18} color={color.ok} />
        <T variant="small" tone="white" style={styles.text}>{message}</T>
        {actionLabel ? (
          <Pressable
            onPress={onActionPress}
            hitSlop={hitSlopFor(20)}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <T variant="small" weight="bold" tone="white">{actionLabel}</T>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.screen, right: space.screen },
  bar: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    backgroundColor: color.ink, borderRadius: radius.field,
    paddingHorizontal: space.x4, paddingVertical: space.x3,
    // Toast nổi trên mọi thứ như TabBar nên dùng chung mức bóng đó.
    ...shadow.tabBar,
  },
  text: { flex: 1 },
});

import { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, type ViewStyle } from "react-native";
import { color, radius } from "@/theme";

export interface SkeletonProps {
  /** Chiều cao khối. Bề rộng mặc định tràn hàng. */
  height: number;
  width?: number | `${number}%`;
  /** Bo góc. Mặc định `chip`; dùng `card` cho khối ảnh, `pill` cho dòng chữ. */
  shape?: "chip" | "card" | "pill";
  style?: ViewStyle;
}

/**
 * Khối giữ chỗ trong lúc nạp.
 *
 * Nhấp nháy bằng `opacity` với `useNativeDriver` — chạy trên UI thread nên
 * không giật khi JS thread đang bận parse dữ liệu vừa tải về, vốn là đúng lúc
 * skeleton đang hiện.
 *
 * KHÔNG dùng vòng xoay toàn màn: skeleton giữ đúng bố cục sắp hiện ra nên mắt
 * không phải định vị lại khi dữ liệu về.
 */
export function Skeleton({ height, width, shape = "chip", style }: SkeletonProps) {
  const pulse = useMemo(() => new Animated.Value(0.45), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        { height, borderRadius: radius[shape], opacity: pulse },
        width === undefined ? styles.fill : { width },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.plate },
  fill: { alignSelf: "stretch" },
});

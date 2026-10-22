import { StyleSheet, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { color, radius } from "@/theme";

export interface ProductImageProps {
  uri?: string | null;
  /** `plate` bo đều 4 góc (thẻ sản phẩm) · `hero` bo 2 góc dưới (ảnh full-width). */
  shape?: "plate" | "hero";
  /** Tỉ lệ khung. Mặc định 1:1 cho thẻ, 0.92 cho hero. */
  aspectRatio?: number;
  /** Nội dung đè lên ảnh (tag "Mới", nút glass). */
  overlay?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Ảnh sản phẩm đặt trên nền `plate`.
 *
 * Màu nền PHẢI trùng nền ảnh nguồn (#F0F0F0, đo từ catalog thật) — lệch một
 * chút là thấy viền quanh giày. `contentFit: "contain"` để không cắt mất mũi
 * hoặc gót giày.
 */
export function ProductImage({
  uri, shape = "plate", aspectRatio, overlay, style,
}: ProductImageProps) {
  return (
    <View
      style={[
        styles.base,
        shape === "plate" ? styles.plate : styles.hero,
        { aspectRatio: aspectRatio ?? (shape === "hero" ? 0.92 : 1) },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={160}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.plate, overflow: "hidden", width: "100%" },
  plate: { borderRadius: radius.card },
  hero: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
});

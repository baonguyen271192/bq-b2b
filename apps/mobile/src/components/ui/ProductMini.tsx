import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { space } from "@/theme";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { T } from "./T";

export interface ProductMiniProps {
  name: string;
  price: number;
  image?: string | null;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Thẻ sản phẩm nhỏ rộng 150 trong băng cuộn ngang (SPEC §2) — "Bán chạy tuần này".
 *
 * Khác {@link ProductCard}: không có tag, không ♡, không (+), không dòng tình
 * trạng size. Băng ngang là chỗ để LƯỚT, mọi thứ cần cân nhắc nằm ở màn Sản phẩm.
 */
export function ProductMini({ name, price, image, onPress, style }: ProductMiniProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={[styles.card, down && styles.down, style]}
    >
      <ProductImage uri={image} />
      <View style={styles.body}>
        <T variant="small" weight="semibold" numberOfLines={2}>{name}</T>
        <Price value={price} variant="bodyStrong" weight="bold" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 150, gap: space.x2 },
  body: { gap: space.x1 },
  down: { transform: [{ scale: 0.98 }] },
});

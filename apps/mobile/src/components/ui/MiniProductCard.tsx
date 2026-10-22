import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { space } from "@/theme";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { T } from "./T";

export interface MiniProductCardProps {
  name: string;
  price: number;
  image?: string | null;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Thẻ sản phẩm nhỏ trong băng ngang — trợ lý gợi ý mẫu. */
export function MiniProductCard({ name, price, image, onPress, style }: MiniProductCardProps) {
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
        <T variant="micro" numberOfLines={2}>{name}</T>
        <Price value={price} variant="micro" tone="bq" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 132, gap: space.x2 },
  body: { gap: space.x1 },
  down: { opacity: 0.75 },
});

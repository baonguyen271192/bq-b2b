import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import type { Product } from "@bq/types";
import { vnd } from "@bq/core";
import { Text, colors, radius, shadow, space } from "@/legacy-theme";
import { Badge } from "./Badge";

interface Props {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: Props) {
  const inStock = Object.values(product.sizes).reduce((s, n) => s + n, 0);
  // Lợi nhuận/đôi là con số đại lý thật sự quyết định mua hay không — quan trọng hơn
  // giá nhập, nên để ngay cạnh giá thay vì giấu trong trang chi tiết.
  const margin = product.retail - product.price;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { transform: [{ scale: 0.985 }] } : null]}
    >
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: product.image }}
          style={styles.thumb}
          contentFit="cover"
          transition={160}
        />
        {inStock <= 0 ? (
          <View style={styles.soldOut}>
            <Badge label="Hết hàng" tone="danger" />
          </View>
        ) : null}
      </View>

      <View style={{ padding: space.md, gap: 4 }}>
        <Text variant="caption" color={colors.textFaint}>{product.code}</Text>
        <Text variant="bodySm" weight="600" numberOfLines={2} style={{ minHeight: 40 }}>
          {product.name}
        </Text>
        <Text variant="bodyLg" weight="800" color={colors.brand[500]}>
          {vnd(product.price)}
        </Text>
        {margin > 0 ? (
          <Text variant="caption" color={colors.success.fg}>
            Lãi {vnd(margin)}/đôi
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  thumbWrap: { aspectRatio: 1, backgroundColor: colors.surfaceSunken },
  thumb: { width: "100%", height: "100%" },
  soldOut: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.78)",
  },
});

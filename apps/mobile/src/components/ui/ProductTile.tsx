import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { Product } from "@bq/types";
import { space } from "@/theme";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { StatusTag } from "./StatusTag";
import { T } from "./T";

export interface ProductTileProps {
  product: Product;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Một mẫu giày trong lưới.
 *
 * Lợi nhuận/đôi để NGAY dưới giá chứ không giấu trong trang chi tiết: đó mới là
 * con số đại lý dựa vào để quyết định nhập hay không.
 *
 * `flexGrow` + `flexBasis` thay cho `width: "48%"`: số cột tự suy ra từ bề rộng
 * màn, nên trên máy rộng hơn lưới thành ba cột mà không phải khai thêm điểm ngắt.
 */
export function ProductTile({ product, onPress, style }: ProductTileProps) {
  const [down, setDown] = useState(false);
  const inStock = Object.values(product.sizes).reduce((s, n) => s + n, 0);
  const margin = product.retail - product.price;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, mã ${product.code}`}
      style={[styles.tile, down && styles.down, style]}
    >
      <ProductImage
        uri={product.image}
        overlay={
          inStock <= 0 ? (
            <View style={styles.soldOut}>
              <StatusTag label="Hết hàng" kind="danger" />
            </View>
          ) : null
        }
      />
      <View style={styles.body}>
        <T variant="micro" tone="faint">{product.code}</T>
        <T variant="small" weight="semibold" numberOfLines={2} style={styles.name}>
          {product.name}
        </T>
        <Price value={product.price} variant="bodyStrong" tone="bq" />
        {margin > 0 ? (
          <Price value={margin} variant="micro" tone="ok" suffix="/đôi lãi" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flexGrow: 1, flexBasis: 150, gap: space.x2 },
  body: { gap: space.x1 },
  // Hai dòng tên cố định chiều cao: thiếu nó thì mẫu tên ngắn và tên dài lệch
  // nhau, giá ở hàng dưới không thẳng cột.
  name: { minHeight: 36 },
  soldOut: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  down: { opacity: 0.75 },
});

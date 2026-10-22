import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { Product } from "@bq/types";
import { color, radius, space } from "@/theme";
import { Num, Price, ProductImage, T } from "../ui";

export interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  /** `grid` cho lưới 2 cột · `spotlight` cho thẻ lớn cuộn ngang ở trang chủ. */
  variant?: "grid" | "spotlight";
  /** Hiện tag "Mới" góc trái ảnh. */
  isNew?: boolean;
  style?: ViewStyle;
}

/** Số size còn hàng — dùng làm dòng "tình trạng size" dưới giá. */
function sizeSummary(sizes: Record<string, number>) {
  const available = Object.entries(sizes).filter(([, n]) => n > 0);
  if (available.length === 0) return "Tạm hết hàng";
  return `Còn ${available.length}/${Object.keys(sizes).length} size`;
}

/**
 * Thẻ sản phẩm: ảnh trên plate, rồi mã → tên → giá sỉ → lợi nhuận → tình trạng
 * size. Ghép từ `ProductImage` + `T`/`Price`; không tự vẽ ảnh hay chữ.
 *
 * Dòng lợi nhuận/đôi nằm NGAY dưới giá, không giấu trong trang chi tiết: đó là
 * con số đại lý dựa vào để quyết định nhập hay không, quan trọng hơn giá nhập.
 */
export function ProductCard({
  product, onPress, variant = "grid", isNew, style,
}: ProductCardProps) {
  const [down, setDown] = useState(false);
  const spotlight = variant === "spotlight";
  const margin = product.retail - product.price;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, giá sỉ ${product.price} đồng mỗi đôi`}
      style={[spotlight ? styles.spotlight : styles.grid, down && styles.down, style]}
    >
      <ProductImage
        uri={product.image}
        aspectRatio={spotlight ? 1.05 : 1}
        overlay={isNew ? (
          <View style={styles.newTag}>
            <T variant="micro" tone="white">Mới</T>
          </View>
        ) : null}
      />

      <View style={styles.body}>
        <Num variant="micro" tone="muted">{product.code}</Num>
        <T variant={spotlight ? "bodyStrong" : "small"} weight="semibold" numberOfLines={2}>
          {product.name}
        </T>
        <Price value={product.price} suffix=" /đôi" variant={spotlight ? "heading" : "bodyStrong"} />
        {margin > 0 ? <Price value={margin} variant="micro" tone="ok" suffix=" lãi/đôi" /> : null}
        <T variant="micro" tone={Object.values(product.sizes).some((n) => n > 0) ? "muted" : "danger"}>
          {sizeSummary(product.sizes)}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, gap: space.x2 },
  spotlight: { width: 232, gap: space.x2 },
  body: { gap: 2 },
  newTag: {
    position: "absolute", top: space.x3, left: space.x3,
    backgroundColor: color.ink, borderRadius: radius.chip,
    paddingHorizontal: space.x2, paddingVertical: space.x1,
  },
  down: { transform: [{ scale: 0.98 }] },
});

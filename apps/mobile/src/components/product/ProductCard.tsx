import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vndK } from "@bq/core";
import type { Product } from "@bq/types";
import { color, hitSlopFor, radius, space } from "@/theme";
import { Price, ProductImage, T } from "../ui";

/** Tối đa MỘT tag. Hai tag trên một thẻ thì không tag nào còn nghĩa. */
export type ProductTag = "Mới" | "Bán chạy";

export interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  tag?: ProductTag | null;
  favourite?: boolean;
  onToggleFavourite?: () => void;
  /** Mở sheet Đặt nhanh. Bỏ trống thì không hiện nút (+). */
  onQuickAdd?: () => void;
  /**
   * Thay dòng tình trạng size bằng ghi chú khác — màn Mất kết nối dùng
   * "Tồn kho lúc 09:12" vì lúc đó tình trạng size đã không còn đáng tin.
   */
  stockNote?: string;
  style?: ViewStyle;
}

type SizeState = { text: string; tone: "ok" | "muted" | "warn" };

/**
 * Tình trạng size BẰNG CHỮ (SPEC §2).
 *
 * v1 dùng dãy chấm màu; v2 bỏ hẳn vì đó là ngôn ngữ tự chế không có chú giải,
 * trong khi cùng một thông tin viết ra chữ thì ai cũng đọc được ngay.
 */
export function sizeState(sizes: Record<string, number>): SizeState {
  const all = Object.keys(sizes).sort((a, b) => Number(a) - Number(b));
  const inStock = all.filter((s) => sizes[s] > 0);
  const out = all.filter((s) => sizes[s] <= 0);

  if (inStock.length === 0) return { text: "Tạm hết hàng", tone: "warn" };
  if (inStock.length <= 2) {
    return { text: `Sắp hết, còn size ${inStock.join(", ")}`, tone: "warn" };
  }
  if (out.length > 0) return { text: `Hết size ${out.join(", ")}`, tone: "muted" };
  return { text: `Đủ size ${inStock[0]}–${inStock[inStock.length - 1]}`, tone: "ok" };
}

/**
 * Thẻ sản phẩm trong lưới 2 cột (SPEC §2).
 *
 * Ba nút đè lên ảnh (tag, ♡, +) là ANH EM của `Pressable` thẻ, không lồng bên
 * trong: lồng vào thì một cú chạm chạy cả hai handler, và trên web nút con
 * không chặn được sự kiện của cha.
 *
 * Hậu tố "/đôi" cố ý KHÔNG hiện ở lưới: ô rộng 170pt mà "1.080.000đ/đôi" đã
 * chiếm 112pt, cộng chip lãi 58pt là tràn.
 */
export function ProductCard({
  product, onPress, tag, favourite, onToggleFavourite, onQuickAdd, stockNote, style,
}: ProductCardProps) {
  const [down, setDown] = useState(false);
  const margin = product.retail - product.price;
  const size = sizeState(product.sizes);

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.price} đồng mỗi đôi, ${size.text}`}
        style={down && styles.down}
      >
        <ProductImage uri={product.image} />
        <View style={styles.body}>
          <T variant="label" weight="semibold" numberOfLines={2}>{product.name}</T>
          <View style={styles.priceRow}>
            <Price value={product.price} variant="bodyStrong" weight="bold" />
            {margin > 0 ? (
              <View style={styles.marginChip}>
                <T variant="chip" weight="bold" tone="ok">{`Lãi ${vndK(margin)}`}</T>
              </View>
            ) : null}
          </View>
          <T variant="small" weight="medium" tone={stockNote ? "muted" : size.tone}>
            {stockNote ?? size.text}
          </T>
        </View>
      </Pressable>

      {/* Lớp nút ĐÈ LÊN ẢNH. `aspectRatio: 1` khớp đúng khung ảnh vuông nên
          nút (+) neo được vào đáy ảnh thay vì đáy cả thẻ. */}
      <View style={styles.overlay} pointerEvents="box-none">
        {tag ? (
          <View style={styles.tag} pointerEvents="none">
            <T variant="badge" weight="semibold" tone="white">{tag}</T>
          </View>
        ) : null}

        {onToggleFavourite ? (
          <Pressable
            onPress={onToggleFavourite}
            hitSlop={hitSlopFor(32)}
            accessibilityRole="button"
            accessibilityLabel={
              favourite ? `Bỏ yêu thích ${product.name}` : `Yêu thích ${product.name}`
            }
            accessibilityState={{ selected: !!favourite }}
            style={styles.fav}
          >
            <Ionicons
              name={favourite ? "heart" : "heart-outline"}
              size={18}
              color={favourite ? color.danger : color.ink}
            />
          </Pressable>
        ) : null}

        {onQuickAdd ? (
          <Pressable
            onPress={onQuickAdd}
            accessibilityRole="button"
            accessibilityLabel={`Đặt nhanh ${product.name}`}
            style={styles.add}
          >
            <Ionicons name="add" size={22} color={color.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  body: { gap: space.x1, marginTop: 10 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  marginChip: {
    height: 22, paddingHorizontal: space.x2, borderRadius: radius.marginChip,
    backgroundColor: color.okTint, alignItems: "center", justifyContent: "center",
    marginLeft: "auto",
  },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, aspectRatio: 1 },
  tag: {
    position: "absolute", top: space.x2, left: space.x2, height: 24,
    paddingHorizontal: space.x2, borderRadius: radius.chip,
    backgroundColor: color.ink, alignItems: "center", justifyContent: "center",
  },
  fav: {
    position: "absolute", top: space.x2, right: space.x2,
    width: 32, height: 32, borderRadius: radius.pill,
    backgroundColor: color.whiteA(0.9), alignItems: "center", justifyContent: "center",
  },
  down: { transform: [{ scale: 0.98 }] },
  add: {
    position: "absolute", right: space.x2, bottom: space.x2, width: 44, height: 44,
    borderRadius: radius.pill, backgroundColor: color.ink,
    alignItems: "center", justifyContent: "center",
  },
});

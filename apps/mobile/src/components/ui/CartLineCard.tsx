import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { Card } from "./Card";
import { Chip } from "./Chip";
import { IconButton } from "./IconButton";
import { Num } from "./Num";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { T } from "./T";

export interface CartLineCardProps {
  name: string;
  image?: string | null;
  unitPrice: number;
  /** size -> số đôi. */
  sizes: Record<string, number>;
  onRemove?: () => void;
  onEdit?: () => void;
  style?: ViewStyle;
}

/**
 * Một mã hàng trong giỏ: ảnh, tên, đơn giá × số đôi, thành tiền, và dải size.
 *
 * Nhận từng trường rời chứ không nhận cả object `CartLine` của `lib/cart`: thư
 * mục ui/ không được phụ thuộc vào lớp trạng thái của app, nếu không thì sau
 * này đổi store là phải sửa cả bộ component.
 */
export function CartLineCard({
  name, image, unitPrice, sizes, onRemove, onEdit, style,
}: CartLineCardProps) {
  const pairs = Object.values(sizes).reduce((s, n) => s + n, 0);
  const rows = Object.entries(sizes).sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <Card variant="flat" style={style}>
      <View style={styles.top}>
        <ProductImage uri={image} style={styles.thumb} />
        <View style={styles.main}>
          <T variant="bodyStrong" numberOfLines={2}>{name}</T>
          <Price value={unitPrice} variant="chip" tone="muted" suffix={` × ${pairs} đôi`} />
          <Price value={unitPrice * pairs} variant="bodyStrong" tone="brand" />
        </View>
        {onRemove ? (
          <IconButton
            icon="trash-outline"
            tone="light"
            accessibilityLabel={`Xoá ${name} khỏi giỏ`}
            onPress={onRemove}
          />
        ) : null}
      </View>

      <View style={styles.sizes}>
        {rows.map(([size, qty]) => (
          <View key={size} style={styles.sizeTag}>
            <Num variant="chip">{size}</Num>
            <Num variant="chip" tone="muted">{`×${qty}`}</Num>
          </View>
        ))}
        {onEdit ? <Chip label="Sửa" onPress={onEdit} accessibilityLabel={`Sửa size ${name}`} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", gap: space.x3, alignItems: "flex-start", padding: space.x4 },
  thumb: { width: 72, aspectRatio: 1 },
  main: { flex: 1, gap: space.x1 },
  sizes: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.x2,
    paddingHorizontal: space.x4, paddingBottom: space.x4,
  },
  sizeTag: {
    flexDirection: "row", alignItems: "center", gap: space.x1,
    paddingHorizontal: space.x3, height: 28,
    borderRadius: radius.chip, backgroundColor: color.canvas,
  },
});

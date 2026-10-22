import { StyleSheet, View, type ViewStyle } from "react-native";
import { vnd } from "@bq/core";
import { color, radius, space } from "@/theme";
import { IconButton } from "./IconButton";
import { Num } from "./Num";
import { ProductImage } from "./ProductImage";
import { SizeChip } from "./SizeChip";
import { T } from "./T";
import { TextButton } from "./TextButton";

export interface CartLineCardProps {
  code: string;
  name: string;
  image?: string | null;
  /** Màu đã chọn, nếu mẫu có nhiều màu. */
  colour?: string;
  sizes: Record<string, number>;
  unitPrice: number;
  onEditSizes?: () => void;
  onRemove?: () => void;
  style?: ViewStyle;
}

/**
 * Một mẫu trong giỏ (SPEC §3.6).
 *
 * Gom theo MẪU chứ không theo từng đôi: một đơn sỉ 50 đôi mà liệt kê 50 dòng thì
 * không ai đọc được. Bảng size hiện bằng {@link SizeChip} — xem được ngay mình
 * đã đặt size nào bao nhiêu mà không phải mở lại màn chọn.
 */
export function CartLineCard({
  code, name, image, colour, sizes, unitPrice, onEditSizes, onRemove, style,
}: CartLineCardProps) {
  const entries = Object.entries(sizes)
    .filter(([, n]) => n > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  const pairs = entries.reduce((s, [, n]) => s + n, 0);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <ProductImage uri={image} style={styles.thumb} />
        <View style={styles.main}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <T variant="chip" tone="muted" numberOfLines={1}>
                {[code, colour && `màu ${colour}`].filter(Boolean).join(", ")}
              </T>
              <T variant="label" weight="semibold" numberOfLines={2}>{name}</T>
            </View>
            {onRemove ? (
              <IconButton
                icon="close"
                tone="light"
                accessibilityLabel={`Xoá ${name} khỏi giỏ`}
                onPress={onRemove}
                style={styles.remove}
              />
            ) : null}
          </View>
          <View style={styles.sizes}>
            {entries.map(([size, qty]) => <SizeChip key={size} size={size} qty={qty} />)}
          </View>
        </View>
      </View>

      <View style={styles.foot}>
        {onEditSizes ? <TextButton label="Sửa size" underline onPress={onEditSizes} /> : <View />}
        <View style={styles.totals}>
          <T variant="chip" tone="muted">{`${pairs} đôi`}</T>
          <Num variant="bodyStrong" weight="bold">{vnd(pairs * unitPrice)}</Num>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.paper, borderRadius: radius.card, padding: space.x3, gap: space.x3 },
  row: { flexDirection: "row", gap: space.x3 },
  thumb: { width: 88, borderRadius: radius.field },
  main: { flex: 1, gap: space.x2 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.x2 },
  headText: { flex: 1, gap: 1 },
  // Nút × nhỏ hơn 44 về mặt thị giác nhưng `IconButton` đã nới vùng chạm bằng hitSlop.
  remove: { width: 32, height: 32 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  foot: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.x3 },
  totals: { alignItems: "flex-end", gap: 1 },
});

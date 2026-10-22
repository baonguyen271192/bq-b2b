import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@bq/types";
import { color, radius, space } from "@/theme";
import { CardDivider } from "./Card";
import { Num } from "./Num";
import { Pill } from "./Pill";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { StatusTag, statusKindFor } from "./StatusTag";
import { T } from "./T";

/** Tối đa 3 ảnh, nhiều hơn thì ô "+N" (SPEC §3.7). */
const MAX_THUMBS = 3;

export interface OrderCardProps {
  order: Order;
  /** Ảnh theo mã sản phẩm — `OrderItem` không mang ảnh, màn phải tra giúp. */
  imageOf?: (code: string) => string | null | undefined;
  onPress?: () => void;
  /** Hiện nút "Mua lại" — chỉ cho đơn đã nhận (SPEC §3.7). */
  onReorder?: () => void;
  reordering?: boolean;
  style?: ViewStyle;
}

/**
 * Một đơn trong danh sách (SPEC §3.7).
 *
 * Nhận cả object `Order` chứ không nhận sáu prop rời: số mẫu và số đôi phải suy
 * ra từ `items`, và phép cộng đó không nên nằm trong screen.
 */
export function OrderCard({
  order, imageOf, onPress, onReorder, reordering, style,
}: OrderCardProps) {
  const [down, setDown] = useState(false);
  const pairs = order.items.reduce((s, i) => s + i.qty_total, 0);
  const thumbs = order.items.slice(0, MAX_THUMBS);
  const extra = order.items.length - thumbs.length;

  return (
    <View style={[styles.card, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        accessibilityRole="button"
        accessibilityLabel={`Đơn ${order.id}, ${order.status}, ${vndLabel(order.subtotal)}`}
        style={down && styles.down}
      >
        <View style={styles.head}>
          <View style={styles.headText}>
            <Num variant="bodyStrong" weight="bold">{order.id}</Num>
            <T variant="small" tone="muted">{order.created_at.split(" ")[0]}</T>
          </View>
          <StatusTag label={order.status} kind={statusKindFor(order.status)} />
        </View>

        <View style={styles.body}>
          <View style={styles.thumbs}>
            {thumbs.map((it) => (
              <ProductImage key={it.code} uri={imageOf?.(it.code)} style={styles.thumb} />
            ))}
            {extra > 0 ? (
              <View style={[styles.thumb, styles.more]}>
                <Num variant="chip" weight="bold" tone="muted">{`+${extra}`}</Num>
              </View>
            ) : null}
          </View>
          <View style={styles.totals}>
            <T variant="small" tone="muted">{`${order.items.length} mẫu, ${pairs} đôi`}</T>
            <Price value={order.subtotal} variant="cardTitle" weight="bold" />
          </View>
        </View>
      </Pressable>

      {onReorder ? (
        <>
          <CardDivider />
          <View style={styles.actions}>
            <Pill
              label="Mua lại"
              tone="outline"
              size={40}
              loading={reordering}
              leading={<Ionicons name="refresh" size={18} color={color.ink} />}
              onPress={onReorder}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Nhãn tiền cho trình đọc màn hình — gọn hơn chuỗi có dấu chấm phân cách. */
function vndLabel(n: number): string {
  return `${n.toLocaleString("vi-VN")} đồng`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper, borderRadius: radius.card,
    padding: space.x4, gap: space.x3,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.x3 },
  headText: { flex: 1, gap: 1 },
  body: { flexDirection: "row", alignItems: "flex-end", gap: space.x3, marginTop: space.x3 },
  thumbs: { flex: 1, flexDirection: "row", gap: space.x2 },
  thumb: { width: 52, borderRadius: radius.thumb },
  more: {
    height: 52, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
  totals: { alignItems: "flex-end", gap: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  down: { opacity: 0.7 },
});

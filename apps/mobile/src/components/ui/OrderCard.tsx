import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@bq/types";
import { color, space } from "@/theme";
import { Card } from "./Card";
import { Num } from "./Num";
import { Price } from "./Price";
import { StatusTag, statusKindFor } from "./StatusTag";
import { T } from "./T";

export interface OrderCardProps {
  order: Order;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Một đơn trong danh sách — dùng ở cả tab Trang chủ lẫn tab Đơn hàng.
 *
 * Nhận cả object `Order` chứ không nhận sáu prop rời: số mã và số đôi phải suy
 * ra từ `items`, và phép cộng đó không nên nằm trong screen. Đổi lại component
 * này biết kiểu miền — chấp nhận được vì `@bq/types` là gói dùng chung, không
 * phải store hay lớp gọi API.
 */
export function OrderCard({ order, onPress, style }: OrderCardProps) {
  const [down, setDown] = useState(false);
  const pairs = order.items.reduce((s, i) => s + i.qty_total, 0);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={`Đơn ${order.id}, ${order.status}`}
      style={[down && styles.down, style]}
    >
      <Card>
        <View style={styles.row}>
          <View style={styles.main}>
            <View style={styles.top}>
              <Num variant="bodyStrong">{order.id}</Num>
              <StatusTag label={order.status} kind={statusKindFor(order.status)} />
            </View>
            <T variant="chip" tone="muted">
              {order.created_at} · {order.items.length} mã · {pairs} đôi
            </T>
            <Price value={order.subtotal} variant="bodyStrong" tone="brand" />
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.muted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  main: { flex: 1, gap: space.x1 },
  top: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x2,
  },
  down: { opacity: 0.7 },
});

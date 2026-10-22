import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ORDER_STEPS, orderStep } from "@bq/core";
import type { Order } from "@bq/types";
import { color, radius, space } from "@/theme";
import { Num, Price, T } from "../ui";
import { StepTrack } from "./StepTrack";

export interface DeliveryCardProps {
  order: Order;
  /**
   * "Dự kiến nhận 22/10, BQ Express".
   *
   * `Order` của backend KHÔNG có ngày dự kiến lẫn hãng vận chuyển
   * (`packages/types/src/order.ts`). Bỏ trống thì card hiện TRẠNG THÁI THẬT thay
   * vì bịa một ngày giao — xem `// TODO(api)` ở màn Trang chủ.
   */
  eta?: string | null;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Thẻ đơn chưa hoàn tất ở Trang chủ (SPEC §3.2 mục 4). Chạm cả thẻ → Chi tiết đơn.
 */
export function DeliveryCard({ order, eta, onPress, style }: DeliveryCardProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={`Đơn ${order.id}, ${order.status}`}
      style={[styles.card, down && styles.down, style]}
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="car-outline" size={20} color={color.info} />
        </View>
        <View style={styles.text}>
          <Num variant="bodyStrong" weight="bold">{order.id}</Num>
          <T variant="small" tone="muted" numberOfLines={2}>{eta ?? order.status}</T>
        </View>
        <Price value={order.subtotal} variant="bodyStrong" weight="bold" />
      </View>
      <StepTrack steps={ORDER_STEPS} current={orderStep(order.status)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper, borderRadius: radius.card,
    padding: space.x4, gap: space.x4,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  icon: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: color.infoTint,
    alignItems: "center", justifyContent: "center",
  },
  text: { flex: 1, gap: 1 },
  down: { transform: [{ scale: 0.98 }] },
});

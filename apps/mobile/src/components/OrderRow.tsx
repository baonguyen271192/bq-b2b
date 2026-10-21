import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@bq/types";
import { vnd } from "@bq/core";
import { Text, colors, radius, space } from "@/theme";
import { Badge, toneForStatus } from "./Badge";

export function OrderRow({ order, onPress }: { order: Order; onPress?: () => void }) {
  const pairs = order.items.reduce((s, i) => s + i.qty_total, 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.top}>
          <Text variant="bodySm" weight="700">{order.id}</Text>
          <Badge label={order.status} tone={toneForStatus(order.status)} />
        </View>
        <Text variant="caption" color={colors.textMuted}>
          {order.created_at} · {order.items.length} mã · {pairs} đôi
        </Text>
        <Text variant="bodySm" weight="700" color={colors.brand[500]}>
          {vnd(order.subtotal)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
});

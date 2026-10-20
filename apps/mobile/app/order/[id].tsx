import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@bq/types";
import { nextActionLabel, vnd } from "@bq/core";
import { Badge, toneForStatus } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { Text, colors, radius, space } from "@/theme";

/** Các mốc của vòng đời đơn sỉ — dùng để vẽ dòng thời gian. */
const STEPS = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang đóng gói",
  "Đang bàn giao vận chuyển",
  "Đại lý đã nhận",
];

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.order(id).then(setOrder).catch(() => setOrder(null));
  }, [id]);

  if (!order) {
    return <View style={styles.center}><ActivityIndicator color={colors.brand[500]} /></View>;
  }

  const current = STEPS.indexOf(order.status);
  const cancelled = toneForStatus(order.status) === "danger";

  return (
    <Screen>
      <Card>
        <View style={styles.head}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" color={colors.textMuted}>Mã đơn</Text>
            <Text variant="h2">{order.id}</Text>
          </View>
          <Badge label={order.status} tone={toneForStatus(order.status)} />
        </View>
        <Text variant="caption" color={colors.textMuted} style={{ marginTop: space.sm }}>
          Đặt lúc {order.created_at} · qua {order.channel}
        </Text>
      </Card>

      {!cancelled ? (
        <Card>
          <Text variant="h3" style={{ marginBottom: space.md }}>Tiến trình</Text>
          {STEPS.map((step, i) => {
            const done = current >= 0 && i <= current;
            const active = i === current;
            return (
              <View key={step} style={styles.step}>
                <View style={styles.rail}>
                  <View style={[styles.dot, done ? styles.dotDone : null, active ? styles.dotActive : null]}>
                    {done ? <Ionicons name="checkmark" size={12} color={colors.textOnBrand} /> : null}
                  </View>
                  {i < STEPS.length - 1 ? (
                    <View style={[styles.spine, i < current ? styles.spineDone : null]} />
                  ) : null}
                </View>
                <Text
                  variant="bodySm"
                  weight={active ? "700" : "500"}
                  color={done ? colors.text : colors.textFaint}
                  style={{ paddingBottom: space.lg }}
                >
                  {step}
                </Text>
              </View>
            );
          })}
          {nextActionLabel(order.status) ? (
            <Text variant="caption" color={colors.textMuted}>
              Bước kế tiếp do BQ thực hiện: {nextActionLabel(order.status)}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text variant="h3" style={{ marginBottom: space.md }}>Hàng hoá</Text>
        {order.items.map((item) => (
          <View key={item.code} style={styles.item}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodySm" weight="600" numberOfLines={2}>{item.name}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {Object.entries(item.sizes).map(([s, q]) => `${s}×${q}`).join("  ")}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text variant="bodySm" weight="700">{vnd(item.line_total)}</Text>
              <Text variant="caption" color={colors.textMuted}>{item.qty_total} đôi</Text>
            </View>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text variant="body" weight="700">Tổng cộng</Text>
          <Text variant="h3" color={colors.brand[500]}>{vnd(order.subtotal)}</Text>
        </View>
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: space.md }}>Giao & thanh toán</Text>
        <Row label="Giao tới" value={order.delivery} />
        <Row label="Thanh toán" value={order.payment} />
        {order.approver ? <Row label="Người duyệt" value={order.approver} /> : null}
        {order.approve_note ? <Row label="Ghi chú" value={order.approve_note} /> : null}
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySm" color={colors.textMuted}>{label}</Text>
      <Text variant="bodySm" weight="600" style={{ flex: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.md },
  step: { flexDirection: "row", gap: space.md },
  rail: { alignItems: "center", width: 22 },
  dot: {
    width: 22, height: 22, borderRadius: radius.pill,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
  dotActive: { borderColor: colors.brand[500] },
  spine: { flex: 1, width: 2, backgroundColor: colors.border },
  spineDone: { backgroundColor: colors.brand[500] },
  item: { flexDirection: "row", gap: space.md, paddingVertical: space.sm, alignItems: "flex-start" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.md },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row: { flexDirection: "row", gap: space.lg, paddingVertical: 5 },
});

import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import type { Order } from "@bq/types";
import { nextActionLabel } from "@bq/core";
import { api } from "@/lib/api";
import { color, space } from "@/theme";
import {
  Card, CardDivider, DetailRow, Num, Price, SectionHead, StatusTag, statusKindFor, T, Timeline,
} from "@/components/ui";

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
    return <View style={styles.center}><ActivityIndicator color={color.brand} /></View>;
  }

  const kind = statusKindFor(order.status);
  const cancelled = kind === "danger";
  const next = nextActionLabel(order.status);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.body}
      showsVerticalScrollIndicator={false}
    >
      <Card>
        <View style={styles.head}>
          <View style={styles.headText}>
            <T variant="chip" tone="muted">Mã đơn</T>
            <Num variant="title">{order.id}</Num>
          </View>
          <StatusTag label={order.status} kind={kind} />
        </View>
        <T variant="chip" tone="muted" style={styles.meta}>
          Đặt lúc {order.created_at} · qua {order.channel}
        </T>
      </Card>

      {!cancelled ? (
        <View>
          <SectionHead title="Tiến trình" />
          <Card>
            <Timeline
              steps={STEPS.map((label, i) => ({
                label,
                state:
                  i < STEPS.indexOf(order.status) ? "done"
                  : i === STEPS.indexOf(order.status) ? "current"
                  : "todo",
              }))}
            />
            {next ? (
              <T variant="chip" tone="muted">Bước kế tiếp do BQ thực hiện: {next}</T>
            ) : null}
          </Card>
        </View>
      ) : null}

      <View>
        <SectionHead title="Hàng hoá" />
        <Card>
          {order.items.map((item, i) => (
            <View key={item.code}>
              {i > 0 ? <View style={styles.rule}><CardDivider /></View> : null}
              <View style={styles.item}>
                <View style={styles.itemMain}>
                  <T variant="bodyStrong" numberOfLines={2}>{item.name}</T>
                  <T variant="chip" tone="muted">
                    {Object.entries(item.sizes).map(([s, q]) => `${s}×${q}`).join("  ")}
                  </T>
                </View>
                <View style={styles.itemRight}>
                  <Price value={item.line_total} variant="bodyStrong" />
                  <T variant="chip" tone="muted">{item.qty_total} đôi</T>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.rule}><CardDivider /></View>
          <DetailRow
            label="Tổng cộng"
            strong
            value={<Price value={order.subtotal} variant="section" tone="brand" />}
          />
        </Card>
      </View>

      <View>
        <SectionHead title="Giao & thanh toán" />
        <Card>
          <DetailRow label="Giao tới" value={order.delivery} />
          <DetailRow label="Thanh toán" value={order.payment} />
          {order.approver ? <DetailRow label="Người duyệt" value={order.approver} /> : null}
          {order.approve_note ? <DetailRow label="Ghi chú" value={order.approve_note} /> : null}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x5, paddingBottom: space.x12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.canvas },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.x3 },
  headText: { gap: space.x1 },
  meta: { marginTop: space.x2 },
  rule: { marginVertical: space.x3 },
  item: { flexDirection: "row", gap: space.x3, alignItems: "flex-start" },
  itemMain: { flex: 1, gap: space.x1 },
  itemRight: { alignItems: "flex-end", gap: space.x1 },
});

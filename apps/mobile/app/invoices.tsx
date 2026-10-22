import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { vnd } from "@bq/core";
import type { Order } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  Card, EmptyState, ListRow, Notice, ScreenHeader, Skeleton, StatusTag,
} from "@/components/ui";

/**
 * Danh sách hoá đơn VAT, vào từ Hồ sơ (SPEC §3.22, dòng cuối).
 *
 * Liệt kê các ĐƠN đã nhận — mỗi đơn là một hoá đơn tiềm năng. Trạng thái hoá
 * đơn chưa đọc được từ đâu nên hiện "Chưa phát hành" cho tất cả, kèm ghi chú
 * giải thích, thay vì gắn nhãn "Đã ký số" mà không có gì bảo đảm.
 */
export default function InvoicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      const rows = await api.orders(dealer.code);
      setOrders(rows.filter((o) => o.status.toLowerCase().includes("đã nhận")));
    } catch {
      setOrders([]);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x3 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        variant="back"
        title="Hoá đơn VAT"
        caption={orders === null ? " " : `${orders.length} đơn đã nhận`}
        onBack={() => router.back()}
      />

      {/* TODO(api): chưa nối hệ thống hoá đơn điện tử. */}
      <Notice kind="plain">
        BQ phát hành hoá đơn điện tử sau khi giao hàng. Đơn nào đã có hoá đơn sẽ
        tải được bản PDF ngay tại đây.
      </Notice>

      {orders === null ? (
        <Skeleton height={160} shape="card" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Chưa có hoá đơn"
          hint="Hoá đơn xuất sau khi đơn được giao và nhận xong."
        />
      ) : (
        <Card>
          {orders.map((o, i) => (
            <ListRow
              key={o.id}
              icon="receipt-outline"
              title={o.id}
              subtitle={`${o.created_at.split(" ")[0]} · ${vnd(o.subtotal)}`}
              trailing={<StatusTag label="Chưa phát hành" kind="neutral" />}
              divider={i < orders.length - 1}
              onPress={() => router.push(`/invoice/${o.id}`)}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, paddingBottom: space.x12, gap: space.x3 },
});

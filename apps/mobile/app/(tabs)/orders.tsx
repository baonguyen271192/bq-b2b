import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Order } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { Chip, EmptyState, OrderCard, ScreenHeader } from "@/components/ui";

const FILTERS = [
  { key: "all", label: "Tất cả", match: () => true },
  { key: "pending", label: "Chờ duyệt", match: (s: string) => s.includes("duyệt") || s.includes("Chờ xác nhận") },
  { key: "shipping", label: "Đang giao", match: (s: string) => s.includes("giao") || s.includes("đóng gói") },
  { key: "done", label: "Đã nhận", match: (s: string) => s.includes("đã nhận") },
] as const;

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      setOrders(await api.orders(dealer.code));
    } catch {
      setOrders([]);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    return (orders ?? []).filter((o) => f.match(o.status));
  }, [orders, filter]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.x3 }]}>
        <ScreenHeader title="Đơn hàng" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      </View>

      {orders === null ? (
        <View style={styles.center}><ActivityIndicator color={color.brand} /></View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Không có đơn hàng"
          hint="Chưa có đơn nào ở trạng thái này. Chọn mẫu ở tab Sản phẩm để tạo đơn."
          actionLabel="Đặt hàng"
          onActionPress={() => router.push("/(tabs)/products")}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={color.brand}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            />
          }
        >
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} onPress={() => router.push(`/order/${o.id}`)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  header: {
    backgroundColor: color.canvas,
    paddingHorizontal: space.screen,
    paddingBottom: space.x3,
    gap: space.x3,
  },
  chips: { gap: space.x2, paddingRight: space.screen },
  body: { padding: space.screen, paddingTop: space.x2, gap: space.x3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

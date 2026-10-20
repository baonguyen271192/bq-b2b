import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Order } from "@bq/types";
import { EmptyState } from "@/components/EmptyState";
import { OrderRow } from "@/components/OrderRow";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text variant="h2">Đơn hàng</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, filter === f.key ? styles.chipActive : null]}
            >
              <Text variant="label" color={filter === f.key ? colors.textOnBrand : colors.slate[600]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {orders === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Không có đơn hàng"
          hint="Chưa có đơn nào ở trạng thái này."
          action={{ label: "Đặt hàng", onPress: () => router.push("/(tabs)/products") }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.brand[500]}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            />
          }
        >
          {visible.map((o) => (
            <OrderRow key={o.id} order={o} onPress={() => router.push(`/order/${o.id}`)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingBottom: space.md,
    gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  chips: { gap: space.sm, paddingRight: space.lg },
  chip: { paddingHorizontal: space.lg, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
  chipActive: { backgroundColor: colors.brand[500] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

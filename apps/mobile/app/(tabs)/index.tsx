import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Order } from "@bq/types";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CreditMeter } from "@/components/CreditMeter";
import { EmptyState } from "@/components/EmptyState";
import { OrderRow } from "@/components/OrderRow";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, refresh } = useSession();
  const { subtotal: cartValue, lines } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      setOrders(await api.orders(dealer.code));
    } catch {
      setOrders([]);
    }
  }, [dealer]);

  // Tải lại mỗi lần quay về tab: công nợ và trạng thái đơn đổi khi đang ở màn khác.
  useFocusEffect(useCallback(() => { void load(); void refresh(); }, [load, refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refresh()]);
    setRefreshing(false);
  };

  if (!dealer) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Dải cam là LỚP NỀN tuyệt đối, không phải một khối trong luồng.
          Trước đây dùng lề âm để kéo thẻ đè lên dải cam, nhưng phần nhô lên bị chính
          khung cuộn cắt mất. Tách nền ra thì không còn gì để cắt, và dải cam cuộn
          theo nội dung nên màn hình dài ra cũng không bị hụt nền. */}
      <View style={[styles.heroBg, { height: insets.top + 168 }]} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.surface} />
        }
      >
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" color="rgba(255,255,255,0.85)">Xin chào,</Text>
            <Text variant="h2" color={colors.textOnBrand} numberOfLines={1}>
              {dealer.name}
            </Text>
          </View>
          <IconButton icon="notifications-outline" onPress={() => router.push("/notifications")} badge={2} />
          <IconButton icon="cart-outline" onPress={() => router.push("/cart")} badge={lines.length} />
        </View>

        <View style={styles.heroMeta}>
          <Text variant="caption" color="rgba(255,255,255,0.85)">{dealer.code}</Text>
          <Badge label={`★ Hạng ${dealer.tier}`} tone="brand" />
        </View>

        <CreditMeter
          limit={dealer.credit_limit}
          used={dealer.credit_used}
          pending={cartValue}
          dueLabel={cartValue > 0 ? undefined : "Xem chi tiết công nợ"}
        />

        <View style={styles.actions}>
          <Button
            label="Tạo đơn hàng mới"
            icon="add"
            onPress={() => router.push("/(tabs)/products")}
            style={{ flex: 1 }}
          />
          <Pressable style={styles.draftBtn} onPress={() => router.push("/cart")}>
            <Text variant="bodySm" weight="700">Giỏ hàng</Text>
            <View style={styles.count}>
              <Text variant="micro" color={colors.textOnBrand}>{lines.length}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text variant="h3">Đơn hàng gần đây</Text>
          <Pressable onPress={() => router.push("/(tabs)/orders")}>
            <Text variant="label" color={colors.brand[500]}>Xem tất cả</Text>
          </Pressable>
        </View>

        {orders && orders.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Chưa có đơn nào"
            hint="Đơn bạn đặt sẽ hiện ở đây kèm trạng thái giao hàng."
            action={{ label: "Đặt đơn đầu tiên", onPress: () => router.push("/(tabs)/products") }}
          />
        ) : (
          <View style={{ gap: space.sm }}>
            {(orders ?? []).slice(0, 4).map((o) => (
              <OrderRow key={o.id} order={o} onPress={() => router.push(`/order/${o.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push("/assistant")}>
        <Ionicons name="sparkles" size={22} color={colors.textOnBrand} />
      </Pressable>
    </View>
  );
}

function IconButton({
  icon, onPress, badge,
}: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn} hitSlop={6}>
      <Ionicons name={icon} size={21} color={colors.textOnBrand} />
      {badge ? (
        <View style={styles.dot}>
          <Text variant="micro" color={colors.brand[500]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.brand[500],
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: space.md },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  dot: {
    position: "absolute", top: -2, right: -2,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  body: { padding: space.lg, gap: space.lg },
  actions: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  draftBtn: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 54, paddingHorizontal: space.lg,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  count: {
    minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: radius.pill,
    backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center",
  },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fab: {
    position: "absolute", right: space.lg, bottom: space.lg,
    width: 56, height: 56, borderRadius: radius.pill,
    backgroundColor: colors.slate[900],
    alignItems: "center", justifyContent: "center",
    shadowColor: "#0F172A", shadowOpacity: 0.35, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
});

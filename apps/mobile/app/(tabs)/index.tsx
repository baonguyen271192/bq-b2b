import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { Order } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  Chip, CreditCard, EmptyState, Fab, FAB_CLEARANCE, IconButton, OrderCard, Pill, ScreenHeader,
  SectionHead,
} from "@/components/ui";

/**
 * Chiều cao dải cam sau tiêu đề, CHƯA tính vùng an toàn.
 *
 * Đủ phủ hàng tiêu đề và hàng hạng đại lý, rồi kết thúc sau lưng thẻ hạn mức —
 * nên mép dưới của dải không bao giờ lộ ra thành một đường ngang.
 */
const HERO_H = space.x12 * 3 + space.x6;

/** Số đơn gần đây hiện trên trang chủ. Xem hết thì sang tab Đơn hàng. */
const RECENT_LIMIT = 4;

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
    <View style={styles.screen}>
      {/* Dải cam là LỚP NỀN tuyệt đối, không phải một khối trong luồng.
          Trước đây dùng lề âm để kéo thẻ đè lên dải cam, nhưng phần nhô lên bị
          chính khung cuộn cắt mất. Tách nền ra thì không còn gì để cắt.

          Gradient dừng ở `bq` -> `bqDeep`, KHÔNG dùng `bqBright`: chữ trắng
          trên `bqBright` chỉ đạt 2.61:1 — không hợp lệ kể cả với chữ lớn. */}
      <LinearGradient
        colors={[color.bq, color.bqDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { height: insets.top + HERO_H }]}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x4 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.white} />
        }
      >
        <ScreenHeader
          tone="onBrand"
          size="title"
          eyebrow="Xin chào,"
          title={dealer.name}
          trailing={
            <>
              <IconButton
                icon="notifications-outline"
                tone="glass"
                badge={2}
                accessibilityLabel="Thông báo"
                onPress={() => router.push("/notifications")}
              />
              <IconButton
                icon="cart-outline"
                tone="glass"
                badge={lines.length}
                accessibilityLabel="Giỏ hàng"
                onPress={() => router.push("/cart")}
              />
            </>
          }
        />

        <View style={styles.meta}>
          <Chip label={dealer.code} tone="brand" />
          <Chip label={`★ Hạng ${dealer.tier}`} tone="brand" />
        </View>

        <CreditCard
          limit={dealer.credit_limit}
          used={dealer.credit_used}
          pending={cartValue}
          detailLabel={cartValue > 0 ? undefined : "Xem chi tiết công nợ"}
          onPressDetail={() => router.push("/(tabs)/debt")}
        />

        <View style={styles.actions}>
          <Pill
            label="Tạo đơn hàng mới"
            tone="brand"
            style={styles.grow}
            onPress={() => router.push("/(tabs)/products")}
          />
          <Pill
            label="Giỏ hàng"
            tone="paper"
            onPress={() => router.push("/cart")}
          />
        </View>

        <View>
          <SectionHead
            title="Đơn hàng gần đây"
            actionLabel="Xem tất cả"
            onActionPress={() => router.push("/(tabs)/orders")}
          />
          {orders && orders.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="Chưa có đơn nào"
              hint="Chọn mẫu ở tab Sản phẩm, nhập số lượng theo bảng size rồi gửi đơn."
              actionLabel="Đặt đơn đầu tiên"
              onActionPress={() => router.push("/(tabs)/products")}
            />
          ) : (
            <View style={styles.list}>
              {(orders ?? []).slice(0, RECENT_LIMIT).map((o) => (
                <OrderCard key={o.id} order={o} onPress={() => router.push(`/order/${o.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Fab
        icon="sparkles"
        accessibilityLabel="Trợ lý BQ"
        style={styles.fab}
        onPress={() => router.push("/assistant")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  hero: { position: "absolute", top: 0, left: 0, right: 0 },
  body: { padding: space.screen, gap: space.x5, paddingBottom: FAB_CLEARANCE },
  meta: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  actions: { flexDirection: "row", gap: space.x2, alignItems: "center" },
  grow: { flex: 1 },
  list: { gap: space.x3 },
  fab: { position: "absolute", right: space.screen, bottom: space.x6 },
});

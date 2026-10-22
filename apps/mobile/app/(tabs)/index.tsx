import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { dayMonth, dueDateOf, orderIsOpen, vndShort } from "@bq/core";
import type { Order, Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { DeliveryCard } from "@/components/home/DeliveryCard";
import {
  Avatar, CreditCard, IconButton, Pill, Price, ProductMini, QuickAction, SectionHead,
  OfflineBanner, Skeleton, T, TAB_BAR_CLEARANCE, hhmm,
} from "@/components/ui";

/** Số mẫu trong băng "Bán chạy tuần này". */
const SPOTLIGHT_LIMIT = 8;
/** Số đơn chưa xong hiện trên Trang chủ; còn lại xem ở tab Đơn hàng. */
const OPEN_LIMIT = 2;

/** "Chào buổi sáng," đổi theo giờ máy (SPEC §3.2 mục 1). */
function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "Chào buổi sáng,";
  if (h < 14) return "Chào buổi trưa,";
  if (h < 18) return "Chào buổi chiều,";
  return "Chào buổi tối,";
}

/**
 * Hoá đơn gần đến hạn nhất trong số chưa thanh toán.
 *
 * Hạn SUY RA từ `created_at` + số ngày trong chuỗi `payment` (xem
 * `@bq/core/credit`); đơn nào không suy ra được thì bỏ qua chứ không đoán.
 */
function nextDue(orders: Order[]): { label: string; amount: number } | null {
  const rows = orders
    .map((o) => ({ due: dueDateOf(o.created_at, o.payment), amount: o.subtotal }))
    .filter((x): x is { due: Date; amount: number } => x.due !== null)
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  return rows[0] ? { label: dayMonth(rows[0].due), amount: rows[0].amount } : null;
}

/** Trang chủ (SPEC §3.2, ảnh `02-Home.png`). */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, refresh } = useSession();
  const { lines } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [spotlight, setSpotlight] = useState<Product[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    // `allSettled`: băng sản phẩm hỏng thì vẫn phải thấy đơn và ngược lại.
    const [o, p] = await Promise.allSettled([
      api.orders(dealer.code),
      api.products(dealer.code),
    ]);
    const failed = o.status === "rejected" && p.status === "rejected";
    // setState DẠNG HÀM, không đọc `orders`/`spotlight` hiện tại: đọc chúng thì
    // `load` phải khai vào deps, mà `useFocusEffect` chạy lại theo `load` -> tải
    // lại -> đổi state -> tải lại, thành vòng lặp vô hạn.
    setOrders((prev) => (o.status === "fulfilled" ? o.value : (prev ?? [])));
    setSpotlight((prev) =>
      p.status === "fulfilled" ? p.value.slice(0, SPOTLIGHT_LIMIT) : (prev ?? []));
    setOffline(failed);
    if (!failed) setFetchedAt(new Date());
  }, [dealer]);

  // Tải lại mỗi lần quay về tab: công nợ và trạng thái đơn đổi khi đang ở màn khác.
  useFocusEffect(useCallback(() => { void load(); void refresh(); }, [load, refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refresh()]);
    setRefreshing(false);
  };

  if (!dealer) return null;

  const open = (orders ?? []).filter((o) => orderIsOpen(o.status)).slice(0, OPEN_LIMIT);
  const due = nextDue(orders ?? []);
  const usedRatio = dealer.credit_limit ? dealer.credit_used / dealer.credit_limit : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + space.x3, paddingBottom: TAB_BAR_CLEARANCE },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand} />
      }
    >
      {offline ? <OfflineBanner at={hhmm(fetchedAt)} onRetry={onRefresh} /> : null}

      <View style={styles.header}>
        <Avatar name={dealer.name} />
        <View style={styles.hello}>
          <T variant="small" tone="muted">{greeting()}</T>
          <T variant="title" numberOfLines={1}>{dealer.name}</T>
        </View>
        {/* TODO(api): chưa có số thông báo chưa đọc, nên badge để trống. */}
        <IconButton
          icon="notifications-outline"
          accessibilityLabel="Thông báo"
          onPress={() => router.push("/notifications")}
        />
        <IconButton
          icon="bag-outline"
          badge={lines.length}
          accessibilityLabel="Giỏ hàng"
          onPress={() => router.push("/cart")}
        />
      </View>

      <CreditCard
        label="Hạn mức khả dụng"
        amount={dealer.credit_available}
        // TODO(api): % chiết khấu theo hạng chưa có trong `Dealer` (thiết kế ghi
        // "Hạng Vàng, CK 20%"), nên chỉ hiện hạng.
        chip={{ label: `Hạng ${dealer.tier}` }}
        progress={usedRatio}
        stats={[
          { label: "Tổng hạn mức", value: vndShort(dealer.credit_limit) },
          { label: "Đã dùng", value: vndShort(dealer.credit_used) },
        ]}
        extra={due ? (
          <View style={styles.due}>
            <Ionicons name="calendar-outline" size={18} color={color.white} />
            <View style={styles.dueText}>
              <T variant="chip" tone="white">{`Hạn thanh toán ${due.label}`}</T>
              <Price value={due.amount} variant="bodyStrong" weight="bold" tone="white" />
            </View>
            <Pill
              label="Thanh toán"
              tone="onBrand"
              size={36}
              onPress={() => router.push("/(tabs)/debt")}
            />
          </View>
        ) : null}
      />

      <View style={styles.actions}>
        <QuickAction
          icon="add"
          label="Tạo đơn"
          tone="ink"
          onPress={() => router.push("/(tabs)/products")}
        />
        <QuickAction icon="refresh" label="Đặt lại" onPress={() => router.push("/(tabs)/orders")} />
        <QuickAction
          icon="document-text-outline"
          label="Đơn nháp"
          onPress={() => router.push("/drafts")}
        />
        <QuickAction
          icon="sparkles-outline"
          label="Trợ lý AI"
          onPress={() => router.push("/assistant")}
        />
      </View>

      {orders === null ? (
        <Skeleton height={124} shape="card" />
      ) : open.length > 0 ? (
        <View style={styles.deliveries}>
          {open.map((o) => (
            <DeliveryCard
              key={o.id}
              order={o}
              // TODO(api): `Order` chưa có ngày dự kiến nhận lẫn hãng vận chuyển,
              // nên thẻ hiện TRẠNG THÁI THẬT thay vì bịa một ngày giao.
              eta={null}
              onPress={() => router.push(`/order/${o.id}`)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHead
          title="Bán chạy tuần này"
          actionLabel="Xem tất cả ›"
          onActionPress={() => router.push("/(tabs)/products")}
        />
        {spotlight === null ? (
          <View style={styles.rail}>
            <Skeleton width={150} height={206} shape="card" />
            <Skeleton width={150} height={206} shape="card" />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {/* TODO(api): chưa có xếp hạng bán chạy — tạm lấy đầu danh mục. */}
            {spotlight.map((p) => (
              <ProductMini
                key={p.code}
                name={p.name}
                price={p.price}
                image={p.image}
                onPress={() => router.push(`/product/${p.code}`)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x4 },
  header: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  hello: { flex: 1, gap: 1 },
  due: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  dueText: { flex: 1, gap: 1 },
  actions: { flexDirection: "row", gap: space.x3 },
  deliveries: { gap: space.x3 },
  section: { gap: space.x3 },
  // Băng ngang tràn ra mép phải màn hình (SPEC §2 ProductMini), nên bù lại lề
  // phải bằng padding của chính nội dung cuộn.
  rail: { gap: space.x3, paddingRight: space.screen },
});

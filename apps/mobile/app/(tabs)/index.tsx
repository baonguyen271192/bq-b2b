import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { dayMonth, nextDueInvoice, orderIsOpen, vndShort } from "@bq/core";
import type { CreditDetail, Order, Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { DeliveryCard } from "@/components/home/DeliveryCard";
import { ReorderSheet } from "@/components/home/ReorderSheet";
import {
  Avatar, CreditCard, IconButton, Pill, Price, ProductMini, QuickAction, SectionHead,
  OfflineBanner, Skeleton, T, TAB_BAR_CLEARANCE, Toast, hhmm,
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

/** Trang chủ (SPEC §3.2, ảnh `02-Home.png`). */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, refresh } = useSession();
  const { lines, upsert } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [spotlight, setSpotlight] = useState<Product[] | null>(null);
  const [credit, setCredit] = useState<CreditDetail | null>(null);
  const [reorderSheet, setReorderSheet] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    // `allSettled`: băng sản phẩm hỏng thì vẫn phải thấy đơn và ngược lại.
    const [o, p, c] = await Promise.allSettled([
      api.orders(dealer.code),
      api.products(dealer.code),
      api.credit(dealer.code),
    ]);
    const failed = o.status === "rejected" && p.status === "rejected";
    // setState DẠNG HÀM, không đọc `orders`/`spotlight` hiện tại: đọc chúng thì
    // `load` phải khai vào deps, mà `useFocusEffect` chạy lại theo `load` -> tải
    // lại -> đổi state -> tải lại, thành vòng lặp vô hạn.
    setOrders((prev) => (o.status === "fulfilled" ? o.value : (prev ?? [])));
    setSpotlight((prev) =>
      p.status === "fulfilled" ? p.value.slice(0, SPOTLIGHT_LIMIT) : (prev ?? []));
    setCredit((prev) => (c.status === "fulfilled" ? c.value : prev));
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

  /**
   * Chép một đơn cũ vào giỏ.
   *
   * Đọc LẠI danh mục thay vì tin giá trong đơn cũ: giá theo bậc và tồn kho đã
   * đổi từ lúc đặt. Mẫu nào ngừng bán thì bỏ qua và nói rõ, không âm thầm tạo
   * một giỏ thiếu hàng.
   */
  const reorder = async (order: Order) => {
    if (!dealer || reordering) return;
    setReordering(order.id);
    try {
      const rows = await api.products(dealer.code);
      const byCode = new Map(rows.map((p) => [p.code, p]));
      let added = 0;
      for (const item of order.items) {
        const product = byCode.get(item.code);
        if (!product) continue;
        upsert(product, item.sizes);
        added += 1;
      }
      if (added === 0) {
        setToast("Các mẫu trong đơn này đã ngừng bán.");
        return;
      }
      setReorderSheet(false);
      router.push("/cart");
    } catch {
      setToast("Không đọc được danh mục. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setReordering(null);
    }
  };

  if (!dealer) return null;

  const open = (orders ?? []).filter((o) => orderIsOpen(o.status)).slice(0, OPEN_LIMIT);
  /*
   * Khoản tới hạn gần nhất đọc từ `api.credit()` — CÙNG nguồn và CÙNG hàm với
   * tab Công nợ.
   *
   * Bản cũ tự quét `api.orders()` nên vơ cả đơn đã nhận và đã trả tiền: Trang
   * chủ hiện "Hạn thanh toán 22/10 — 2.128.000đ" của đơn BQ1016 đã tất toán từ
   * 23/09, trong khi tab Công nợ cùng lúc chỉ đúng hoá đơn 1.197.000đ đang quá
   * hạn. Hai màn nói hai số về cùng một khoản nợ.
   */
  const due = nextDueInvoice(credit?.invoices ?? []);
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
              <T variant="chip" tone="white">
                {due.left !== null && due.left < 0
                  ? `Quá hạn ${-due.left} ngày · ${dayMonth(due.due as Date)}`
                  : `Hạn thanh toán ${dayMonth(due.due as Date)}`}
              </T>
              <Price value={due.order.subtotal} variant="bodyStrong" weight="bold" tone="white" />
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
        {/* Mở sheet 5 đơn đã nhận gần nhất, không phải đẩy sang tab Đơn hàng:
            nhãn "Đặt lại" hứa một hành động, không phải một màn danh sách. */}
        <QuickAction icon="refresh" label="Đặt lại" onPress={() => setReorderSheet(true)} />
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
      <ReorderSheet
        visible={reorderSheet}
        onClose={() => setReorderSheet(false)}
        orders={orders ?? []}
        busyId={reordering}
        onOpenOrder={(o) => { setReorderSheet(false); router.push(`/order/${o.id}`); }}
        onReorder={(o) => void reorder(o)}
      />

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
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

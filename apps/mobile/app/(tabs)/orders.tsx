import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { orderStep } from "@bq/core";
import type { Order, Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  EmptyState, IconButton, OfflineBanner, OrderCard, ScreenHeader, SegmentedControl, Skeleton,
  TAB_BAR_CLEARANCE, Toast, hhmm,
} from "@/components/ui";

type Tab = "all" | "pending" | "shipping" | "done";

/** Màn Đơn hàng (SPEC §3.7, ảnh `07-Orders.png`). */
export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const { upsert } = useCart();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [offline, setOffline] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dealer) return;
    const [o, p] = await Promise.allSettled([
      api.orders(dealer.code),
      api.products(dealer.code),
    ]);
    if (o.status === "fulfilled") {
      setOrders(o.value);
      setFetchedAt(new Date());
      setOffline(false);
    } else {
      setOffline(true);
      setOrders((prev) => prev ?? []);
    }
    if (p.status === "fulfilled") setProducts(p.value);
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const imageOf = useCallback(
    (code: string) => products.find((p) => p.code === code)?.image,
    [products],
  );

  const counts = useMemo(() => {
    const rows = orders ?? [];
    return {
      pending: rows.filter((o) => orderStep(o.status) === 1).length,
      // "Đang giao" gom cả đóng gói và bàn giao: đại lý lọc theo "hàng đang trên
      // đường tới" chứ không theo từng khâu kho.
      shipping: rows.filter((o) => [2, 3].includes(orderStep(o.status))).length,
    };
  }, [orders]);

  const shown = useMemo(() => {
    const rows = orders ?? [];
    if (tab === "all") return rows;
    if (tab === "pending") return rows.filter((o) => orderStep(o.status) === 1);
    if (tab === "shipping") return rows.filter((o) => [2, 3].includes(orderStep(o.status)));
    return rows.filter((o) => orderStep(o.status) === 4);
  }, [orders, tab]);

  /**
   * "Mua lại": dựng giỏ bằng cách ĐỌC LẠI sản phẩm, không chép giá từ đơn cũ.
   * Giá theo bậc và tồn kho đổi theo thời gian; chép lại số cũ là hứa sai.
   */
  const reorder = async (order: Order) => {
    if (!dealer || reordering) return;
    setReordering(order.id);
    try {
      const rows = await api.products(dealer.code);
      const byCode = new Map(rows.map((p) => [p.code, p]));
      let missing = 0;
      for (const item of order.items) {
        const product = byCode.get(item.code);
        if (!product) { missing += 1; continue; }
        upsert(product, item.sizes);
      }
      if (missing === order.items.length) {
        setToast("Các mẫu trong đơn này đã ngừng bán.");
        return;
      }
      router.push("/cart");
    } catch {
      setToast("Không đọc được danh mục. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setReordering(null);
    }
  };

  if (!dealer) return null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: TAB_BAR_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Đơn hàng"
          trailing={
            <IconButton
              icon="search-outline"
              accessibilityLabel="Tìm đơn hàng"
              onPress={() => router.push("/search")}
            />
          }
        />

        <SegmentedControl
          options={[
            { value: "all", label: "Tất cả" },
            { value: "pending", label: "Chờ duyệt", count: counts.pending },
            { value: "shipping", label: "Đang giao", count: counts.shipping },
            { value: "done", label: "Đã nhận" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {offline ? <OfflineBanner at={hhmm(fetchedAt)} onRetry={load} /> : null}

        {orders === null ? (
          <>
            <Skeleton height={132} shape="card" />
            <Skeleton height={132} shape="card" />
          </>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={tab === "all" ? "Chưa có đơn nào" : "Không có đơn trong mục này"}
            hint={
              tab === "all"
                ? "Chọn mẫu rồi đặt số lượng theo từng size để tạo đơn đầu tiên."
                : "Thử xem mục Tất cả để thấy toàn bộ đơn."
            }
            actionLabel={tab === "all" ? "Xem sản phẩm" : "Xem tất cả"}
            onActionPress={() =>
              tab === "all" ? router.push("/(tabs)/products") : setTab("all")}
          />
        ) : (
          shown.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              imageOf={imageOf}
              onPress={() => router.push(`/order/${o.id}`)}
              onReorder={orderStep(o.status) === 4 ? () => void reorder(o) : undefined}
              reordering={reordering === o.id}
            />
          ))
        )}
      </ScrollView>

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
});

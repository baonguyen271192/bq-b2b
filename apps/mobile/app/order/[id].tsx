import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ORDER_STEPS, orderStep } from "@bq/core";
import type { Order, Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, radius, space } from "@/theme";
import {
  Card, CardDivider, Dock, DOCK_CLEARANCE_ACTIONS, EmptyState, Pill, Price, ProductImage,
  ScreenHeader, SizeChip, StatusTag, T, Timeline, Toast, statusKindFor, type TimelineStep,
} from "@/components/ui";

/** Tổng đài BQ — TODO(api): chưa có số Sale phụ trách theo từng đại lý. */
const SUPPORT_PHONE = "02363745745";

/**
 * Chi tiết đơn (SPEC §3.8) và đơn bị từ chối (§3.18).
 *
 * Một màn hai trạng thái chứ không hai route: cùng một đơn, cùng bố cục, chỉ
 * khác khối đầu và cặp nút ở dock. Tách đôi thì mọi sửa đổi phải làm hai lần.
 */
export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dealer, refresh } = useSession();
  const { upsert } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<"receive" | "reorder" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [o, p] = await Promise.allSettled([
      api.order(id),
      dealer ? api.products(dealer.code) : Promise.resolve([] as Product[]),
    ]);
    if (o.status === "fulfilled") setOrder(o.value);
    else setMissing(true);
    if (p.status === "fulfilled") setProducts(p.value);
  }, [id, dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (missing) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState
          icon="help-circle-outline"
          title={`Không thấy đơn ${id}`}
          hint="Đơn có thể đã bị xoá. Quay lại danh sách để xem các đơn khác."
          actionLabel="Về danh sách đơn"
          onActionPress={() => router.replace("/(tabs)/orders")}
        />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.brand} />
      </View>
    );
  }

  const step = orderStep(order.status);
  /** Huỷ hoặc bị từ chối — `orderStep` trả -1 cho cả hai (SPEC §3.18). */
  const cancelled = step < 0;
  const shipping = step === 2;
  const pairs = order.items.reduce((s, i) => s + i.qty_total, 0);
  const imageOf = (code: string) => products.find((p) => p.code === code)?.image;

  /**
   * Mốc thời gian: backend CHỈ có `created_at` của đơn, không có lịch sử từng
   * bước (`// TODO(api)`). Bước đầu dùng mốc thật; các bước sau để trống chứ
   * không bịa giờ — một giờ sai trên đơn hàng là thông tin sai, không phải
   * khoảng trống thẩm mỹ.
   */
  const steps: TimelineStep[] = cancelled
    ? [
      { label: "Gửi đơn", caption: order.created_at, state: "done" },
      { label: "Chờ duyệt hạn mức", state: "done" },
      { label: order.status, caption: order.approver ?? undefined, state: "failed" },
    ]
    : ORDER_STEPS.map((label, i) => ({
      label,
      caption: i === 0 ? order.created_at : undefined,
      state: i < step ? "done" : i === step ? "current" : "todo",
    }));

  const markReceived = async () => {
    setBusy("receive");
    try {
      setOrder(await api.advance(order.id));
      await refresh();
      setToast("Đã xác nhận nhận hàng");
    } catch {
      setToast("Không cập nhật được. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const reorder = async () => {
    if (!dealer) return;
    setBusy("reorder");
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
      if (added === 0) { setToast("Các mẫu trong đơn này đã ngừng bán."); return; }
      router.push("/cart");
    } catch {
      setToast("Không đọc được danh mục. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: DOCK_CLEARANCE_ACTIONS + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          variant="back"
          title="Chi tiết đơn"
          caption={order.id}
          onBack={() => router.back()}
          trailing={<StatusTag label={order.status} kind={statusKindFor(order.status)} />}
        />

        {cancelled ? (
          <View style={styles.rejected}>
            <View style={styles.rejectedHead}>
              <Ionicons name="close-circle" size={20} color={color.danger} />
              <T variant="cardTitle" weight="bold" tone="danger">
                {order.approver ? "Sale đã từ chối đơn này" : "Đơn đã huỷ"}
              </T>
            </View>
            {order.approve_note ? (
              <T variant="label" weight="regular">{`Lý do: ${order.approve_note}`}</T>
            ) : null}
            {order.approver ? (
              <T variant="small" tone="muted">{order.approver}</T>
            ) : null}
          </View>
        ) : (
          <Card style={styles.shipCard}>
            <View style={styles.shipHead}>
              <View style={styles.truck}>
                <Ionicons name="car-outline" size={20} color={color.info} />
              </View>
              <View style={styles.shipText}>
                {/* TODO(api): `Order` chưa có ngày dự kiến nhận lẫn mã vận đơn —
                    hiện nêu bước đang ở, không bịa ngày giao. */}
                <T variant="small" tone="muted">Trạng thái</T>
                <T variant="section">{order.status}</T>
              </View>
            </View>
            <Timeline steps={steps} />
          </Card>
        )}

        <Card style={styles.items}>
          <T variant="cardTitle" weight="bold">Sản phẩm</T>
          {order.items.map((item) => (
            <View key={item.code} style={styles.item}>
              <ProductImage uri={imageOf(item.code)} style={styles.thumb} />
              <View style={styles.itemText}>
                <T variant="small" weight="semibold" numberOfLines={2}>{item.name}</T>
                <View style={styles.sizes}>
                  {Object.entries(item.sizes)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([size, qty]) => <SizeChip key={size} size={size} qty={qty} />)}
                </View>
              </View>
            </View>
          ))}
          <View style={styles.rule}><CardDivider /></View>
          <View style={styles.totals}>
            <T variant="small" tone="muted">{`${pairs} đôi, ${order.payment}`}</T>
            <Price value={order.subtotal} variant="cardTitle" weight="bold" />
          </View>
        </Card>

        {cancelled ? (
          <T variant="small" tone="muted">
            Đơn bị từ chối không ghi nợ. Hàng không được giữ, nên tồn kho có thể
            đã thay đổi khi bạn gửi lại.
          </T>
        ) : null}
      </ScrollView>

      <Dock>
        {cancelled ? (
          <>
            <Pill
              label="Gọi Sale"
              tone="outline"
              leading={<Ionicons name="call-outline" size={20} color={color.ink} />}
              onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            />
            <Pill
              label="Sửa và gửi lại"
              loading={busy === "reorder"}
              style={styles.flex}
              onPress={() => void reorder()}
            />
          </>
        ) : (
          <>
            <Pill
              label="Mua lại"
              tone="outline"
              loading={busy === "reorder"}
              leading={<Ionicons name="refresh" size={20} color={color.ink} />}
              onPress={() => void reorder()}
            />
            {shipping ? (
              <Pill
                label="Đã nhận hàng"
                loading={busy === "receive"}
                style={styles.flex}
                onPress={() => void markReceived()}
              />
            ) : null}
          </>
        )}
      </Dock>

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  center: { justifyContent: "center", paddingHorizontal: space.screen },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  rejected: {
    backgroundColor: color.dangerTint, borderRadius: radius.card,
    padding: space.x4, gap: space.x2,
  },
  rejectedHead: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  shipCard: { gap: space.x4 },
  shipHead: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  truck: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: color.infoTint,
    alignItems: "center", justifyContent: "center",
  },
  shipText: { flex: 1, gap: 1 },
  items: { gap: space.x3 },
  item: { flexDirection: "row", gap: space.x3 },
  thumb: { width: 56 },
  itemText: { flex: 1, gap: space.x1 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  rule: { marginVertical: space.x1 },
  totals: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.x3 },
  flex: { flex: 1 },
});

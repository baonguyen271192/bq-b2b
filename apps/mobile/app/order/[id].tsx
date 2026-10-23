import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import {
  ORDER_STEPS, dayMonth, orderAwaitingApproval, orderStep, paymentLabel, statusLabel,
} from "@bq/core";
import type { Order, Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { orderExtrasRepository, type OrderExtras } from "@/lib/repo/order-extras";
import { supportContact, telUrl } from "@/lib/support";
import { color, radius, space } from "@/theme";
import { NoteSheet } from "@/components/order/NoteSheet";
import {
  AddressCard, Card, CardDivider, DetailRow, Dock, DOCK_CLEARANCE_ACTIONS, EmptyState,
  IconButton, ListRow, Pill, Price, ProductImage, ScreenHeader, SizeChip, T, Timeline,
  Toast, hhmm, statusColorsFor, statusIconFor, type TimelineStep,
} from "@/components/ui";

/** Thứ trong tuần, để câu "Thứ Năm, 22/10/2026" đọc như người nói. */
const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const longDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${dayMonth(d)}/${d.getFullYear()}`;
const shortDateTime = (d: Date) => `${dayMonth(d)} ${hhmm(d)}`;

/**
 * Chi tiết đơn (SPEC §3.8), đơn chờ duyệt (§3.28) và đơn bị từ chối (§3.18).
 *
 * MỘT màn ba trạng thái chứ không ba route: cùng một đơn, cùng bố cục, chỉ khác
 * khối đầu và cặp nút ở dock. Tách ra thì mọi sửa đổi phải làm ba lần.
 */
export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dealer, refresh } = useSession();
  const { upsert } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [extras, setExtras] = useState<OrderExtras | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<"receive" | "reorder" | null>(null);
  const [noteSheet, setNoteSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [o, p] = await Promise.allSettled([
      api.order(id),
      dealer ? api.products(dealer.code) : Promise.resolve([] as Product[]),
    ]);
    if (o.status === "fulfilled") {
      setOrder(o.value);
      if (dealer) setExtras(await orderExtrasRepository.get(o.value, dealer.code));
    } else {
      setMissing(true);
    }
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
  const pending = orderAwaitingApproval(order.status);
  const shipping = step === 3;
  const pairs = order.items.reduce((s, i) => s + i.qty_total, 0);
  const support = supportContact(dealer);
  const imageOf = (code: string) => products.find((p) => p.code === code)?.image;

  /**
   * Năm mốc khớp 1-1 với trạng thái backend (SPEC §3.8).
   *
   * Bước 2 đổi nhãn thành "Chờ Sale duyệt" khi đơn vượt hạn mức: cùng một ô
   * trong quy trình nhưng đang chờ một người khác làm một việc khác.
   */
  const steps: TimelineStep[] = cancelled
    ? [
      { label: ORDER_STEPS[0], caption: order.created_at, state: "done" },
      { label: "Chờ Sale duyệt", state: "done" },
      { label: statusLabel(order.status), caption: order.approver ?? undefined, state: "failed" },
    ]
    : ORDER_STEPS.map((label, i) => {
      const at = extras?.stepTimes[i] ?? null;
      const eta = i === 4 && extras?.eta ? `Dự kiến ${dayMonth(extras.eta)}` : undefined;
      return {
        label: pending && i === 1 ? "Chờ Sale duyệt" : label,
        caption: at ? shortDateTime(at) : i === step ? (pending ? "Đang chờ" : undefined) : eta,
        state: i < step ? "done" : i === step ? "current" : "todo",
      };
    });

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
        {/* KHÔNG có tag trạng thái ở header (SPEC §3.8): trạng thái nằm trên
            dòng thời gian, nơi nó nói được cả "đang ở đâu" lẫn "đã qua những
            đâu". Tag chỉ lặp lại một nửa thông tin đó và bẻ tiêu đề xuống dòng. */}
        <ScreenHeader
          variant="back"
          title="Chi tiết đơn"
          caption={`${order.id}, đặt ${order.created_at.split(" ")[0]}`}
          onBack={() => router.back()}
        />

        {cancelled ? (
          <View style={styles.rejected}>
            <View style={styles.noticeHead}>
              <Ionicons name="close-circle" size={20} color={color.danger} />
              <T variant="cardTitle" weight="bold" tone="danger">
                {order.approver ? "Sale đã từ chối đơn này" : "Đơn đã huỷ"}
              </T>
            </View>
            {order.approve_note ? (
              <T variant="label" weight="regular">{`Lý do: ${order.approve_note}`}</T>
            ) : null}
            {order.approver ? <T variant="small" tone="muted">{order.approver}</T> : null}
          </View>
        ) : pending ? (
          /* TODO(api): chưa có endpoint huỷ đơn (câu hỏi 4 cho BQ). Khi có thì
             thay khối gọi điện này bằng nút "Huỷ đơn" viền danger — SPEC §3.28. */
          <View style={styles.pendingBox}>
            <View style={styles.noticeHead}>
              <Ionicons name="information-circle" size={20} color={color.warn} />
              <T variant="cardTitle" weight="bold" tone="warn" style={styles.flex}>
                {order.over_limit
                  ? "Đơn vượt hạn mức, đang chờ Sale duyệt"
                  : "Đơn đang chờ BQ xác nhận"}
              </T>
            </View>
            <T variant="label" weight="regular">
              {`Muốn huỷ hoặc sửa đơn này, gọi ${support?.isSalesRep ? "Sale phụ trách" : "tổng đài BQ"}. Đơn chưa xuất kho nên huỷ không mất phí.`}
            </T>
            {support ? (
              <Pill
                label={support.label}
                tone="paper"
                size={44}
                leading={<Ionicons name="call-outline" size={20} color={color.ink} />}
                onPress={() => void Linking.openURL(telUrl(support.phone))}
              />
            ) : null}
          </View>
        ) : null}

        {cancelled ? null : (
          <Card style={styles.shipCard}>
            {shipping && extras?.eta ? (
              <View style={styles.etaRow}>
                <View style={styles.etaText}>
                  <T variant="small" tone="muted">Dự kiến nhận</T>
                  <T variant="section">{longDate(extras.eta)}</T>
                </View>
                {extras.trackingNo ? (
                  <View style={styles.track}>
                    <T variant="chip" tone="muted">{extras.carrier}</T>
                    <View style={styles.trackRow}>
                      <T variant="label" weight="semibold" numberOfLines={1}>
                        {extras.trackingNo}
                      </T>
                      <IconButton
                        icon="copy-outline"
                        accessibilityLabel="Sao chép mã vận đơn"
                        onPress={() => {
                          void Clipboard.setStringAsync(extras.trackingNo ?? "");
                          setToast("Đã sao chép mã vận đơn");
                        }}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : pending ? null : (
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: statusColorsFor(order.status).bg }]}>
                  <Ionicons
                    name={statusIconFor(order.status)}
                    size={20}
                    color={statusColorsFor(order.status).fg}
                  />
                </View>
                <View style={styles.etaText}>
                  <T variant="small" tone="muted">Trạng thái</T>
                  <T variant="section">{statusLabel(order.status)}</T>
                </View>
              </View>
            )}
            <Timeline steps={steps} />
          </Card>
        )}

        <Card style={styles.deliver}>
          {extras?.address ? (
            <View style={styles.addrRow}>
              <View style={styles.pin}>
                <Ionicons name="location-outline" size={20} color={color.muted} />
              </View>
              <View style={styles.flex}>
                <T variant="small" tone="muted">Giao đến</T>
                <AddressCard address={extras.address} variant="select" hideDefaultTag />
              </View>
            </View>
          ) : null}
          {/* Ghi chú sửa được khi đơn CHƯA xuất kho; sau đó chỉ còn đọc. */}
          <ListRow
            icon="document-text-outline"
            title={extras?.note ? "Ghi chú cho BQ" : "Thêm ghi chú cho BQ"}
            subtitle={extras?.note ?? "Dặn dò về giao hàng, hoá đơn…"}
            onPress={step >= 3 ? undefined : () => setNoteSheet(true)}
          />
        </Card>

        <Card style={styles.items}>
          <T variant="cardTitle" weight="bold">Sản phẩm</T>
          {/*
            TODO(api) A7.2 — ƯU TIÊN CAO: `OrderItem` không có màu, nên một đơn
            đặt nhiều màu của CÙNG một mẫu hiện ra không phân biệt được màu nào
            bao nhiêu đôi. Khi backend trả màu: mỗi màu MỘT HÀNG, tên màu (12
            muted) đứng trước chip size — thiết kế `08-OrderDetail.png` vẽ "Đen
            24 đôi, Nâu 12 đôi". Tới lúc đó chip size ở đây là cộng dồn các màu.
          */}
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
              <T variant="small" weight="semibold">{`${item.qty_total} đôi`}</T>
            </View>
          ))}

          <View style={styles.rule}><CardDivider /></View>

          <DetailRow label={`Tạm tính (${pairs} đôi)`} value={<Price value={order.subtotal} />} />
          {/* TODO(api): backend chưa trả VAT (SPEC §5-C). Có số thì hiện ba dòng
              Tạm tính / VAT / Tổng; chưa có thì nói rõ giá chưa gồm thuế, không
              tự nhân 8%. */}
          {extras?.vatRate !== null && extras?.vatAmount != null ? (
            <DetailRow
              label={`VAT ${extras.vatRate}%`}
              value={<Price value={extras.vatAmount} />}
            />
          ) : (
            <T variant="small" tone="muted">Giá chưa gồm VAT</T>
          )}
          <DetailRow
            label="Tổng"
            value={<Price value={order.subtotal + (extras?.vatAmount ?? 0)} variant="cardTitle" weight="bold" />}
          />
          <DetailRow
            label="Thanh toán"
            value={<T variant="bodyStrong" weight="semibold">{paymentLabel(order.payment)}</T>}
          />
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
            {support ? (
              <Pill
                label={support.isSalesRep ? "Gọi Sale" : "Gọi tổng đài"}
                tone="outline"
                leading={<Ionicons name="call-outline" size={20} color={color.ink} />}
                onPress={() => void Linking.openURL(telUrl(support.phone))}
              />
            ) : null}
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

      <NoteSheet
        visible={noteSheet}
        value={extras?.note ?? ""}
        onClose={() => setNoteSheet(false)}
        onSave={(note) => {
          void orderExtrasRepository.setNote(order.id, note);
          setExtras((prev) => (prev ? { ...prev, note: note || null } : prev));
          setNoteSheet(false);
          setToast(note ? "Đã lưu ghi chú" : "Đã xoá ghi chú");
        }}
      />

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  center: { justifyContent: "center", paddingHorizontal: space.screen },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  flex: { flex: 1 },
  noticeHead: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  rejected: {
    backgroundColor: color.dangerTint, borderRadius: radius.card,
    padding: space.x4, gap: space.x2,
  },
  pendingBox: {
    backgroundColor: color.warnTint, borderRadius: radius.card,
    padding: space.x4, gap: space.x3, alignItems: "flex-start",
  },
  shipCard: { gap: space.x4 },
  etaRow: { gap: space.x3 },
  etaText: { flex: 1, gap: 1 },
  track: { backgroundColor: color.subtle, borderRadius: radius.thumb, padding: space.x3, gap: 1 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  statusIcon: {
    width: 44, height: 44, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  deliver: { gap: space.x2 },
  addrRow: { flexDirection: "row", gap: space.x3 },
  pin: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
  items: { gap: space.x3 },
  item: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  thumb: { width: 56 },
  itemText: { flex: 1, gap: space.x1 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  rule: { marginVertical: space.x1 },
});

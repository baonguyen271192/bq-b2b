import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { paymentLabel, vnd } from "@bq/core";
import type { Order } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { addressRepository } from "@/lib/repo/addresses";
import { reorderableOrders } from "@/lib/orders";
import { draftRepository, type Draft } from "@/lib/repo/drafts";
import {
  checkStock, dropShortSizes, newIdempotencyKey, submitOrder, trimToStock,
  type StockShortage,
} from "@/lib/repo/orders";
import { color, space } from "@/theme";
import { AddressSheet } from "@/components/cart/AddressSheet";
import { NoteSheet } from "@/components/order/NoteSheet";
import { DeliveryAddressCard } from "@/components/cart/DeliveryAddressCard";
import { OverLimitSheet, type OverLimitChoice } from "@/components/cart/OverLimitSheet";
import { StockChangedSheet, type StockFix } from "@/components/cart/StockChangedSheet";
import {
  Card, CardDivider, CartLineCard, DetailRow, Dock, DOCK_CLEARANCE, EmptyState, ListRow,
  Notice, Pill, Price, ProductImage, ScreenHeader, T, TextButton, Toast,
  type Address,
} from "@/components/ui";

/**
 * Giỏ hàng (SPEC §3.6), giỏ trống (§3.17), sheet vượt hạn mức (§3.14) và toàn
 * bộ luồng gửi đơn của mục 5.D.
 *
 * Đây là nơi DUY NHẤT trong app tạo đơn — màn "Xác nhận đơn" cũ đã bị xoá theo
 * quyết định G, mọi thứ nó làm chuyển hết về đây.
 */
export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, refresh } = useSession();
  const { lines, subtotal, totalPairs: pairs, clear, remove } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string | undefined>();
  const [addressSheet, setAddressSheet] = useState(false);
  const [noteSheet, setNoteSheet] = useState(false);
  /** Ghi chú cho BQ (SPEC §3.30). TODO(api): chưa có trường nào trong `createOrder`. */
  const [note, setNote] = useState("");
  const [overLimitSheet, setOverLimitSheet] = useState(false);
  const [shortages, setShortages] = useState<StockShortage[] | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recent, setRecent] = useState<Order[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const load = useCallback(async () => {
    if (!dealer) return;
    const [addr, orders, saved] = await Promise.allSettled([
      addressRepository.list(dealer.code),
      api.orders(dealer.code),
      draftRepository.list(dealer.code),
    ]);
    if (addr.status === "fulfilled") {
      setAddresses(addr.value);
      setAddressId((prev) => prev ?? addr.value.find((a) => a.isDefault)?.id ?? addr.value[0]?.id);
    }
    if (orders.status === "fulfilled") {
      // Chỉ đơn ĐÃ NHẬN (SPEC §5-N.2) — xem `reorderableOrders`.
      setRecent(reorderableOrders(orders.value, 1));
    }
    if (saved.status === "fulfilled") setDrafts(saved.value);
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const address = addresses.find((a) => a.id === addressId);
  const available = dealer?.credit_available ?? 0;
  const over = Math.max(0, subtotal - available);
  const canOrder = lines.length > 0 && !!address && !sending;

  /** Gửi thật. Tách khỏi `onOrder` vì ba lối khác nhau cùng gọi tới đây. */
  const send = useCallback(async (toSend = lines) => {
    if (!dealer || !addressId) return;
    setSending(true);
    try {
      const short = await checkStock(dealer.code, toSend);
      if (short.length > 0) {
        // Dừng lại TRƯỚC khi gửi: backend lọc im lặng size vượt tồn kho, gửi
        // thẳng thì đơn tạo xong thiếu hàng mà không ai báo.
        setShortages(short);
        return;
      }
      const order = await submitOrder({
        dealerCode: dealer.code,
        lines: toSend,
        addressId,
        idempotencyKey: newIdempotencyKey(),
        note,
      });
      clear();
      await refresh();
      router.replace({ pathname: "/order/sent", params: { id: order.id, status: order.status } });
    } catch {
      // Giữ nguyên giỏ, không tạo đơn trùng (mục 5.D-3).
      setToast("Không gửi được đơn. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setSending(false);
    }
  }, [dealer, addressId, lines, note, clear, refresh, router]);

  const onOrder = () => {
    if (!canOrder) return;
    if (over > 0) { setOverLimitSheet(true); return; }
    void send();
  };

  const onOverLimitChoice = (choice: OverLimitChoice) => {
    setOverLimitSheet(false);
    if (choice === "approve") { void send(); return; }
    if (choice === "pay") { router.push("/pay"); return; }
    router.back();
  };

  const onStockFix = (fix: StockFix) => {
    if (!shortages) return;
    const fixed = fix === "trim" ? trimToStock(lines, shortages) : dropShortSizes(lines, shortages);
    setShortages(null);
    if (fixed.length === 0) {
      setToast("Không còn size nào đặt được. Chọn mẫu khác giúp em nhé.");
      return;
    }
    void send(fixed);
  };

  const saveDraft = async () => {
    if (!dealer || lines.length === 0) return;
    await draftRepository.save(dealer.code, { lines, addressId, subtotal, totalPairs: pairs });
    clear();
    setToast("Đã lưu đơn nháp");
  };

  if (!dealer) return null;

  if (lines.length === 0) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x3 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader variant="back" title="Giỏ hàng" onBack={() => router.back()} />
        <EmptyState
          icon="bag-outline"
          title="Giỏ hàng đang trống"
          hint="Chọn mẫu rồi đặt số lượng theo từng size, hoặc đặt lại một đơn cũ."
          actionLabel="Xem sản phẩm"
          onActionPress={() => router.replace("/(tabs)/products")}
        />

        {recent.length > 0 || drafts.length > 0 ? (
          <View style={styles.again}>
            <View style={styles.againHead}>
              <T variant="section">Đặt lại nhanh</T>
              <TextButton label="Tất cả đơn ›" onPress={() => router.push("/(tabs)/orders")} />
            </View>

            {recent.map((o) => (
              <Card key={o.id} style={styles.reorder}>
                {/* TODO(api): `OrderItem` không mang ảnh, mà đọc lại cả danh mục
                    chỉ để lấy một thumbnail ở màn giỏ TRỐNG là không đáng.
                    `ProductImage` tự vẽ placeholder (SPEC §5-N.2). */}
                <ProductImage uri={null} style={styles.reorderThumb} />
                <View style={styles.reorderText}>
                  <T variant="bodyStrong" weight="bold">{o.id}</T>
                  <T variant="small" tone="muted">
                    {`${o.created_at.split(" ")[0]}, ${o.items.length} mẫu, ${o.items.reduce((s, i) => s + i.qty_total, 0)} đôi`}
                  </T>
                </View>
                {/* TODO(api): "Mua lại" cần đọc lại giá và tồn kho hiện tại rồi
                    mới dựng giỏ — làm ở Phase 5 cùng màn Đơn hàng. */}
                <Pill
                  label="Mua lại"
                  tone="outline"
                  size={40}
                  onPress={() => router.push(`/order/${o.id}`)}
                />
              </Card>
            ))}

            {drafts.length > 0 ? (
              <Card>
                <ListRow
                  icon="document-text-outline"
                  title="Đơn nháp"
                  subtitle={`${drafts[0].id}, ${drafts[0].totalPairs} đôi, ${vnd(drafts[0].subtotal)}`}
                  onPress={() => router.push("/drafts")}
                />
              </Card>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: DOCK_CLEARANCE + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          variant="back"
          title="Giỏ hàng"
          caption={`${lines.length} mẫu, ${pairs} đôi`}
          onBack={() => router.back()}
        />

        <DeliveryAddressCard address={address} onPress={() => setAddressSheet(true)} />

        {lines.map((l) => (
          <CartLineCard
            key={l.code}
            code={l.code}
            name={l.name}
            image={l.image}
            sizes={l.sizes}
            unitPrice={l.unitPrice}
            onEditSizes={() => router.push(`/product/${l.code}`)}
            onRemove={() => remove(l.code)}
          />
        ))}

        {/* Ghi chú đặt SAU danh sách sản phẩm (SPEC §3.30): nó nói về đơn này,
            đọc sau khi đã xem mình đặt gì. */}
        <Card>
          <ListRow
            icon="document-text-outline"
            title="Ghi chú cho BQ"
            subtitle={note || "Thêm ghi chú"}
            onPress={() => setNoteSheet(true)}
          />
        </Card>

        <Card>
          <DetailRow label={`Tạm tính (${pairs} đôi)`} value={<Price value={subtotal} />} />
          <DetailRow label="Vận chuyển" value={<T variant="bodyStrong" tone="ok">Miễn phí</T>} />
          {/* Quyết định I: điều khoản công nợ là thuộc tính hợp đồng của đại lý,
              hiện read-only, không có bộ chọn theo từng đơn.

              Chuỗi lấy qua `paymentLabel` chứ KHÔNG ghi cứng "Công nợ 30 ngày":
              đơn gửi đi xong backend trả về đúng chữ "Công nợ", nên giỏ hàng
              hứa 30 ngày rồi chi tiết đơn tự rút lời. */}
          <DetailRow
            label="Thanh toán"
            value={
              <T variant="bodyStrong" weight="semibold">
                {paymentLabel(dealer.payment_term)}
              </T>
            }
          />
          {/* TODO(api): chưa có trường VAT trong phản hồi tạo đơn (SPEC §5-C).
              Cho tới lúc đó nói rõ giá chưa gồm thuế, thay vì để đại lý chốt đơn
              rồi mới thấy hoá đơn cộng thêm 8%. Khi API trả số thật thì đổi dòng
              này thành hai dòng Tạm tính / Thuế GTGT. */}
          <T variant="small" tone="muted" style={styles.vatNote}>Giá chưa gồm VAT</T>

          <View style={styles.rule}><CardDivider /></View>
          {over > 0 ? (
            <Notice kind="warn">
              {`Đơn vượt hạn mức ${vnd(over)}. Bạn vẫn đặt được, đơn sẽ chờ Sale duyệt.`}
            </Notice>
          ) : (
            <Notice kind="ok">{`Sau đơn này hạn mức còn ${vnd(available - subtotal)}`}</Notice>
          )}
        </Card>
      </ScrollView>

      {/* TODO(api): chưa có trường VAT nên tổng ở dock vẫn là tạm tính và nhãn
          nói "chưa gồm VAT". Khi API trả số thật: nhãn đổi thành "Tổng thanh
          toán, đã gồm VAT" và giá trị cộng thêm tiền thuế (SPEC §5-C). */}
      <Dock left={{ label: "Tổng, chưa gồm VAT", value: <Price value={subtotal} variant="amountMd" weight="extrabold" /> }}>
        <Pill label="Lưu nháp" tone="outline" onPress={saveDraft} />
        <Pill
          label={over > 0 ? "Gửi đơn chờ duyệt" : "Đặt hàng"}
          loading={sending}
          loadingLabel="Đang gửi đơn…"
          disabled={!canOrder}
          style={styles.flex}
          onPress={onOrder}
        />
      </Dock>

      <NoteSheet
        visible={noteSheet}
        value={note}
        onClose={() => setNoteSheet(false)}
        onSave={(v) => {
          setNote(v);
          setNoteSheet(false);
          setToast(v ? "Đã lưu ghi chú" : "Đã xoá ghi chú");
        }}
      />

      <AddressSheet
        visible={addressSheet}
        onClose={() => setAddressSheet(false)}
        addresses={addresses}
        selectedId={addressId}
        startOnForm={addresses.length === 0}
        onSelect={setAddressId}
        onCreate={async (draft) => {
          const created = await addressRepository.add(dealer.code, draft);
          setAddresses(await addressRepository.list(dealer.code));
          setAddressId(created.id);
          setAddressSheet(false);
        }}
      />

      <OverLimitSheet
        visible={overLimitSheet}
        onClose={() => setOverLimitSheet(false)}
        cartTotal={subtotal}
        available={available}
        onConfirm={onOverLimitChoice}
      />

      <StockChangedSheet
        visible={shortages !== null}
        shortages={shortages ?? []}
        onClose={() => setShortages(null)}
        onConfirm={onStockFix}
      />

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  vatNote: { marginTop: space.x2 },
  rule: { marginVertical: space.x3 },
  flex: { flex: 1 },
  again: { gap: space.x3, marginTop: space.x5 },
  againHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reorder: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  reorderThumb: { width: 52 },
  reorderText: { flex: 1, gap: 1 },
});

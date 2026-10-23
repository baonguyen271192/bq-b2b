import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  dayMonth, overdueTotal, unpaidInvoices, vnd, vndShort, type InvoiceRow,
} from "@bq/core";
import type { CreditDetail } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { paymentDeclarations } from "@/lib/repo/payments";
import { color, radius, space } from "@/theme";
import {
  Card, CardDivider, CreditCard, EmptyState, Num, OfflineBanner, Pill, Price, ScreenHeader,
  Skeleton, StatusTag, T, TAB_BAR_CLEARANCE, hhmm,
} from "@/components/ui";

/** Hoá đơn còn ≤ ngần này ngày thì "còn N ngày" đổi màu warn (SPEC §3.9). */
const DUE_SOON_DAYS = 15;

/** Màn Công nợ (SPEC §3.9, ảnh `09-Debt.png`). */
export default function DebtScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [detail, setDetail] = useState<CreditDetail | null>(null);
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      setDetail(await api.credit(dealer.code));
      setFetchedAt(new Date());
      setOffline(false);
    } catch {
      // Giữ số cũ và nói rõ nó cũ từ lúc nào (SPEC §3.15).
      setOffline(true);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // `unpaidInvoices` của `@bq/core` — CÙNG hàm Trang chủ dùng để chọn khoản tới
  // hạn gần nhất, nên hai màn không thể nói hai số khác nhau nữa.
  const unpaid = useMemo(() => unpaidInvoices(detail?.invoices ?? []), [detail]);
  const overdue = overdueTotal(unpaid);

  if (!dealer) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + space.x3, paddingBottom: TAB_BAR_CLEARANCE },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Công nợ" />

      {offline ? <OfflineBanner at={hhmm(fetchedAt)} onRetry={load} /> : null}

      <CreditCard
        label="Dư nợ hiện tại"
        amount={dealer.credit_used}
        chip={
          overdue > 0
            ? { label: `Quá hạn ${vndShort(overdue)}`, alert: true }
            : { label: "Quá hạn 0đ" }
        }
        progress={dealer.credit_limit ? dealer.credit_used / dealer.credit_limit : 0}
        stats={[
          { label: "Hạn mức", value: vndShort(dealer.credit_limit) },
          { label: "Khả dụng", value: vndShort(dealer.credit_available) },
        ]}
      />

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <T variant="cardTitle" weight="bold">Hoá đơn chưa thanh toán</T>
          <T variant="small" tone="muted">
            {detail === null ? " " : `${unpaid.length} hoá đơn`}
          </T>
        </View>

        {detail === null ? (
          <Skeleton height={64} />
        ) : unpaid.length === 0 ? (
          <T variant="small" tone="muted">Không còn hoá đơn nào chờ thanh toán.</T>
        ) : (
          unpaid.map((row, i) => (
            <View key={row.order.id}>
              {i > 0 ? <View style={styles.rule}><CardDivider /></View> : null}
              <InvoiceLine
                row={row}
                first={i === 0}
                declared={paymentDeclarations.declared(row.order.id)}
                onPay={() => router.push(`/transfer/${row.order.id}`)}
                onOpen={() => router.push(`/order/${row.order.id}`)}
              />
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <T variant="cardTitle" weight="bold">Giao dịch gần đây</T>
        {detail === null ? (
          <Skeleton height={64} />
        ) : detail.transactions.length === 0 ? (
          <EmptyState
            icon="swap-vertical-outline"
            title="Chưa có giao dịch"
            hint="Các lần thanh toán và ghi nợ sẽ hiện ở đây."
          />
        ) : (
          detail.transactions.map((t, i) => (
            <View key={t.id} style={[styles.txn, i > 0 && styles.txnDivider]}>
              <View style={[styles.txnIcon, t.amount > 0 ? styles.txnIn : styles.txnOut]}>
                <Ionicons
                  name={t.amount > 0 ? "arrow-down" : "arrow-up"}
                  size={18}
                  color={t.amount > 0 ? color.ok : color.muted}
                />
              </View>
              <View style={styles.txnText}>
                <T variant="label" weight="semibold" numberOfLines={1}>
                  {`${t.method} ${t.order_id}`}
                </T>
                <T variant="chip" tone="muted">{t.created_at.split(" ")[0]}</T>
              </View>
              <Num variant="bodyStrong" weight="bold" tone={t.amount > 0 ? "ok" : "ink"}>
                {`${t.amount > 0 ? "+" : "−"}${vnd(Math.abs(t.amount))}`}
              </Num>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

/** Một dòng hoá đơn chưa thanh toán. */
function InvoiceLine({
  row, first, declared, onPay, onOpen,
}: {
  row: InvoiceRow; first: boolean; declared: boolean;
  onPay: () => void; onOpen: () => void;
}) {
  const { order, due, left } = row;
  const soon = left !== null && left <= DUE_SOON_DAYS;

  return (
    <View style={styles.inv}>
      <View style={styles.invText}>
        <Num variant="label" weight="bold" numberOfLines={1}>{order.id}</Num>
        {due ? (
          <T variant="chip" tone="muted">
            {`Hạn ${dayMonth(due)}, `}
            <T variant="chip" weight={soon ? "semibold" : "regular"} tone={soon ? "warn" : "muted"}>
              {left !== null && left < 0 ? `quá ${-left} ngày` : `còn ${left} ngày`}
            </T>
          </T>
        ) : (
          <T variant="chip" tone="muted">Chưa có hạn thanh toán</T>
        )}
      </View>
      <Price value={order.subtotal} variant="bodyStrong" weight="bold" />
      {declared ? (
        // Quyết định F: đã báo chuyển khoản thì thay nút bằng tag, chờ BQ ghi nhận.
        // Tag xuống DƯỚI tiền chứ không nằm cùng hàng: nhãn dài 19 ký tự đặt
        // cạnh mã + tiền thì mã bị bẻ đôi ở khổ 390.
        <StatusTag label="Chờ BQ ghi nhận" kind="info" />
      ) : first ? (
        <Pill label="Trả ngay" size={36} onPress={onPay} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={color.muted} onPress={onOpen} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  card: { gap: space.x3 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x3 },
  rule: { marginVertical: space.x2 },
  inv: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  invText: { flex: 1, gap: 1 },
  txn: { flexDirection: "row", alignItems: "center", gap: space.x3, paddingVertical: space.x3 },
  txnDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.divider },
  txnIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  txnIn: { backgroundColor: color.okTint },
  txnOut: { backgroundColor: color.subtle },
  txnText: { flex: 1, gap: 1 },
});

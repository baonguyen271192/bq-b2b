import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { vndShort } from "@bq/core";
import type { CreditDetail } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  Card, CardDivider, CreditCard, EmptyState, ListRow, OfflineBanner, Price, ScreenHeader,
  SectionHead, StatusTag, T, TAB_BAR_CLEARANCE, hhmm,
} from "@/components/ui";

export default function DebtScreen() {
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
      // Giữ số cũ và nói rõ nó cũ từ lúc nào — xoá đi thì đại lý mất luôn bảng
      // công nợ đang xem dở (SPEC §3.15).
      setOffline(true);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!dealer) return null;

  const unpaid = detail?.invoices.filter((i) => !i.paid) ?? [];
  const transactions = detail?.transactions ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x3 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Công nợ" />

      {offline ? <OfflineBanner at={hhmm(fetchedAt)} onRetry={load} /> : null}

      <CreditCard
        label="Dư nợ hiện tại"
        amount={dealer.credit_used}
        progress={dealer.credit_limit ? dealer.credit_used / dealer.credit_limit : 0}
        stats={[
          { label: "Hạn mức", value: vndShort(dealer.credit_limit) },
          { label: "Khả dụng", value: vndShort(dealer.credit_available) },
        ]}
      />

      <View>
        <SectionHead title="Hoá đơn chưa thanh toán" />
        {detail === null ? (
          <ActivityIndicator color={color.brand} style={styles.spinner} />
        ) : unpaid.length === 0 ? (
          <Card>
            <T variant="small" tone="muted" style={styles.center}>
              Không có hoá đơn nào đang chờ thanh toán.
            </T>
          </Card>
        ) : (
          <Card variant="flat">
            {unpaid.map((inv, i) => (
              <View key={inv.id}>
                {i > 0 ? <CardDivider /> : null}
                <ListRow
                  title={inv.id}
                  subtitle={`${inv.created_at} · ${inv.payment}`}
                  trailing={
                    <View style={styles.trailing}>
                      <Price value={inv.subtotal} variant="bodyStrong" tone="brand" />
                      <StatusTag label="Chưa trả" kind="warn" />
                    </View>
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </View>

      <View>
        <SectionHead title="Lịch sử giao dịch" />
        {detail === null ? (
          <ActivityIndicator color={color.brand} style={styles.spinner} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title="Chưa có giao dịch"
            hint="Khoản thanh toán cho BQ sẽ hiện ở đây sau khi được đối soát."
          />
        ) : (
          <Card variant="flat">
            {transactions.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <CardDivider /> : null}
                <ListRow
                  title={t.method}
                  subtitle={`${t.created_at} · đơn ${t.order_id}`}
                  trailing={<Price value={-t.amount} variant="bodyStrong" tone="ok" />}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x5, paddingBottom: TAB_BAR_CLEARANCE },
  center: { textAlign: "center" },
  spinner: { marginVertical: space.x8 },
  trailing: { alignItems: "flex-end", gap: space.x1 },
});

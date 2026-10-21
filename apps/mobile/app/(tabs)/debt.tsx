import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CreditDetail } from "@bq/types";
import { vnd } from "@bq/core";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { CreditMeter } from "@/components/CreditMeter";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Text, colors, space } from "@/legacy-theme";

export default function DebtScreen() {
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [detail, setDetail] = useState<CreditDetail | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!dealer) return;
      void api.credit(dealer.code).then(setDetail).catch(() => setDetail(null));
    }, [dealer]),
  );

  if (!dealer) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, gap: space.lg }}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="h2">Công nợ</Text>

      <CreditMeter limit={dealer.credit_limit} used={dealer.credit_used} />

      <View style={{ gap: space.sm }}>
        <Text variant="h3">Hoá đơn chưa thanh toán</Text>
        {detail === null ? (
          <ActivityIndicator color={colors.brand[500]} style={{ marginVertical: space.xl }} />
        ) : detail.invoices.filter((i) => !i.paid).length === 0 ? (
          <Card flat>
            <Text variant="bodySm" color={colors.textMuted} center>
              Không có hoá đơn nào đang chờ thanh toán.
            </Text>
          </Card>
        ) : (
          detail.invoices.filter((i) => !i.paid).map((inv) => (
            <Card key={inv.id} flat>
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="bodySm" weight="700">{inv.id}</Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {inv.created_at} · {inv.payment}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text variant="bodySm" weight="700" color={colors.brand[500]}>{vnd(inv.subtotal)}</Text>
                  <Badge label="Chưa trả" tone="warning" />
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="h3">Lịch sử giao dịch</Text>
        {detail && detail.transactions.length === 0 ? (
          <EmptyState icon="swap-horizontal-outline" title="Chưa có giao dịch" />
        ) : (
          (detail?.transactions ?? []).map((t) => (
            <Card key={t.id} flat>
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="bodySm" weight="600">{t.method}</Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {t.created_at} · đơn {t.order_id}
                  </Text>
                </View>
                <Text variant="bodySm" weight="700" color={colors.success.fg}>
                  −{vnd(t.amount)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
});

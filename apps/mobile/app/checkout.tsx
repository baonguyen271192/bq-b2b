import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

const WAREHOUSES = ["Kho HCM", "Kho Hà Nội", "Kho Đà Nẵng"];
const PAYMENTS = ["Công nợ", "Công nợ 30 ngày", "Chuyển khoản"];

export default function CheckoutScreen() {
  const router = useRouter();
  const { lines, subtotal, totalPairs, clear } = useCart();
  const { dealer, refresh } = useSession();

  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [submitting, setSubmitting] = useState(false);

  const available = dealer?.credit_available ?? 0;
  const overLimit = subtotal > available;

  const submit = async () => {
    if (!dealer) return;
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        dealer_code: dealer.code,
        lines: lines.map((l) => ({ code: l.code, sizes: l.sizes })),
        delivery: warehouse,
        payment,
        channel: "app",
      });
      clear();
      await refresh();
      router.replace(`/order/${order.id}`);
    } catch (e) {
      // Báo lỗi rõ ràng thay vì im lặng: đại lý vừa mất công chọn cả bảng size.
      Alert.alert("Không gửi được đơn", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label={overLimit ? "Gửi đơn chờ duyệt" : "Gửi đơn hàng"}
          loading={submitting}
          onPress={submit}
        />
      }
    >
      <Section title="Kho nhận hàng">
        {WAREHOUSES.map((w) => (
          <Option key={w} label={w} selected={w === warehouse} onPress={() => setWarehouse(w)} />
        ))}
      </Section>

      <Section title="Hình thức thanh toán">
        {PAYMENTS.map((p) => (
          <Option key={p} label={p} selected={p === payment} onPress={() => setPayment(p)} />
        ))}
      </Section>

      <Card>
        <Text variant="h3" style={{ marginBottom: space.md }}>Chi tiết giá trị</Text>
        <Row label={`Tiền hàng · ${totalPairs} đôi`} value={vnd(subtotal)} />
        <Row label="Phí giao" value="Miễn phí" />
        <View style={styles.divider} />
        <Row label="Tổng cộng" value={vnd(subtotal)} strong />
        <View style={styles.divider} />
        <Row label="Hạn mức khả dụng" value={vnd(available)} />
        <Row
          label="Hạn mức sau đơn"
          value={vnd(available - subtotal)}
          tone={overLimit ? colors.danger.fg : colors.success.fg}
        />
      </Card>

      {overLimit ? (
        <Card flat style={styles.warn}>
          <Ionicons name="alert-circle" size={20} color={colors.warning.fg} />
          <Text variant="bodySm" color={colors.warning.fg} style={{ flex: 1 }}>
            Đơn này vượt hạn mức. Sau khi gửi, Sale của BQ sẽ duyệt trước khi đơn được xử lý.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="h3">{title}</Text>
      <View style={{ gap: space.sm }}>{children}</View>
    </View>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.option, selected ? styles.optionActive : null]}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={20}
        color={selected ? colors.brand[500] : colors.textFaint}
      />
      <Text variant="body" weight={selected ? "700" : "500"}>{label}</Text>
    </Pressable>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? "body" : "bodySm"} color={colors.textMuted}>{label}</Text>
      <Text variant={strong ? "h3" : "bodySm"} weight="700" color={tone ?? colors.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  optionActive: { borderColor: colors.brand[500], backgroundColor: colors.brand.tintSoft },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
  warn: {
    flexDirection: "row", gap: space.md, alignItems: "flex-start",
    backgroundColor: colors.warning.bg, borderColor: colors.warning.border,
  },
});

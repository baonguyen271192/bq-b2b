import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  Card, CardDivider, DetailRow, Dock, DOCK_CLEARANCE, Notice, OptionRow, Pill, Price,
  SectionHead,
} from "@/components/ui";

const WAREHOUSES = ["Kho HCM", "Kho Hà Nội", "Kho Đà Nẵng"];
const PAYMENTS = ["Công nợ", "Công nợ 30 ngày", "Chuyển khoản"];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lines, subtotal, totalPairs, clear } = useCart();
  const { dealer, refresh } = useSession();

  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [submitting, setSubmitting] = useState(false);

  const available = dealer?.credit_available ?? 0;
  const overLimit = subtotal > available;
  const afterOrder = available - subtotal;

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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: DOCK_CLEARANCE + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <SectionHead title="Kho nhận hàng" />
          <View style={styles.group}>
            {WAREHOUSES.map((w) => (
              <OptionRow key={w} label={w} selected={w === warehouse} onPress={() => setWarehouse(w)} />
            ))}
          </View>
        </View>

        <View>
          <SectionHead title="Hình thức thanh toán" />
          <View style={styles.group}>
            {PAYMENTS.map((p) => (
              <OptionRow key={p} label={p} selected={p === payment} onPress={() => setPayment(p)} />
            ))}
          </View>
        </View>

        <View>
          <SectionHead title="Chi tiết giá trị" />
          <Card>
            <DetailRow
              label={`Tiền hàng · ${totalPairs} đôi`}
              value={<Price value={subtotal} variant="small" />}
            />
            <DetailRow label="Phí giao" value="Miễn phí" />
            <View style={styles.rule}><CardDivider /></View>
            <DetailRow
              label="Tổng cộng"
              strong
              value={<Price value={subtotal} variant="bodyStrong" />}
            />
            <View style={styles.rule}><CardDivider /></View>
            <DetailRow
              label="Hạn mức khả dụng"
              value={<Price value={available} variant="small" />}
            />
            <DetailRow
              label="Hạn mức sau đơn"
              value={
                <Price value={afterOrder} variant="small" tone={overLimit ? "danger" : "ok"} />
              }
            />
          </Card>
        </View>

        {overLimit ? (
          <Notice kind="warn">
            Đơn này vượt hạn mức. Sau khi gửi, Sale của BQ sẽ duyệt trước khi đơn được xử lý.
          </Notice>
        ) : null}
      </ScrollView>

      <Dock>
        <Pill
          label={overLimit ? "Gửi đơn chờ duyệt" : "Gửi đơn hàng"}
          tone="brand"
          loading={submitting}
          onPress={submit}
        />
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x5 },
  group: { gap: space.x2 },
  rule: { marginVertical: space.x3 },
});

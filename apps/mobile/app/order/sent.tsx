import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { orderAwaitingApproval } from "@bq/core";
import type { Order } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { orderExtrasRepository, type OrderExtras } from "@/lib/repo/order-extras";
import { color, radius, space } from "@/theme";
import {
  Card, CardDivider, DetailRow, EmptyState, Pill, Price, Skeleton, T,
} from "@/components/ui";

/**
 * Câu "Bước tiếp theo" theo trạng thái — nói BQ sẽ làm gì, không lặp lại trạng
 * thái (SPEC §5-N.14).
 */
function nextStep(status: string): string {
  if (orderAwaitingApproval(status)) {
    return "Sale phụ trách sẽ duyệt, bạn nhận thông báo khi có kết quả.";
  }
  return "BQ sẽ đóng gói và báo khi giao cho đơn vị vận chuyển.";
}

/**
 * Màn xác nhận sau khi gửi đơn (SPEC mục 5.D-4 và §5-N.14).
 *
 * `router.replace` chứ không `push` từ phía Giỏ hàng: bấm back ở đây phải về
 * danh mục, không được quay lại cái giỏ đã trống.
 *
 * Đọc LẠI đơn từ API thay vì nhận mọi thứ qua tham số: đơn vừa tạo xong là nguồn
 * sự thật, và việc đọc được nó cũng là bằng chứng đơn đã vào hệ thống thật.
 */
export default function OrderSentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const { id, status } = useLocalSearchParams<{ id?: string; status?: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [extras, setExtras] = useState<OrderExtras | null>(null);

  const load = useCallback(async () => {
    if (!id || !dealer) return;
    try {
      const row = await api.order(id);
      setOrder(row);
      setExtras(await orderExtrasRepository.get(row, dealer.code));
    } catch {
      // Đơn đã gửi xong rồi; không đọc lại được thì vẫn hiện lời xác nhận, chỉ
      // thiếu card tóm tắt.
    }
  }, [id, dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const waiting = orderAwaitingApproval(status ?? order?.status ?? "");
  const pairs = order?.items.reduce((s, i) => s + i.qty_total, 0) ?? 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x8 }]}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          icon="checkmark-circle-outline"
          tone="ok"
          title={`Đã gửi đơn ${id ?? ""}`.trim()}
          hint={
            waiting
              ? "Đơn vượt hạn mức nên đang chờ Sale duyệt."
              : "BQ đã nhận đơn và sẽ xác nhận trong giờ làm việc."
          }
        />

        {order === null ? (
          <Skeleton height={140} shape="card" />
        ) : (
          <Card style={styles.summary}>
            <DetailRow
              label={`${order.items.length} mẫu, ${pairs} đôi`}
              value={<Price value={order.subtotal} variant="cardTitle" weight="bold" />}
            />
            {extras?.address ? (
              <>
                <View style={styles.rule}><CardDivider /></View>
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={18} color={color.muted} />
                  <View style={styles.rowText}>
                    <T variant="small" tone="muted">Giao đến</T>
                    <T variant="label" weight="semibold">{extras.address.label}</T>
                  </View>
                </View>
              </>
            ) : null}
            {extras?.note ? (
              <View style={styles.row}>
                <Ionicons name="document-text-outline" size={18} color={color.muted} />
                <View style={styles.rowText}>
                  <T variant="small" tone="muted">Ghi chú cho BQ</T>
                  <T variant="label" weight="semibold">{extras.note}</T>
                </View>
              </View>
            ) : null}
          </Card>
        )}

        <View style={styles.next}>
          <T variant="small" weight="semibold" tone="muted">Bước tiếp theo</T>
          <T variant="label" weight="regular">{nextStep(status ?? order?.status ?? "")}</T>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.x5 }]}>
        <Pill
          label="Xem đơn"
          tone="outline"
          style={styles.flex}
          onPress={() => router.replace(id ? `/order/${id}` : "/(tabs)/orders")}
        />
        <Pill label="Về trang chủ" style={styles.flex} onPress={() => router.replace("/(tabs)")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x4, paddingBottom: space.x8 },
  summary: { gap: space.x2 },
  rule: { marginVertical: space.x1 },
  row: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  rowText: { flex: 1, gap: 1 },
  next: {
    backgroundColor: color.subtle, borderRadius: radius.option,
    padding: space.x4, gap: space.x1,
  },
  actions: {
    flexDirection: "row", gap: space.x3,
    paddingHorizontal: space.screen, paddingTop: space.x3,
    backgroundColor: color.canvas,
  },
  flex: { flex: 1 },
});

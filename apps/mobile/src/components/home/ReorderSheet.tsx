import { ScrollView, StyleSheet, View } from "react-native";
import { orderStep, vnd } from "@bq/core";
import type { Order } from "@bq/types";
import { space } from "@/theme";
import {
  BottomSheet, EmptyState, ListRow, Pill, T,
} from "../ui";

/** Số đơn hiện trong sheet. Đủ để tìm lại đơn tháng trước, chưa thành danh sách. */
export const REORDER_LIMIT = 5;

export interface ReorderSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Toàn bộ đơn của đại lý; sheet tự lọc đơn ĐÃ NHẬN và cắt còn 5 đơn gần nhất. */
  orders: Order[];
  /** Đang chép đơn nào vào giỏ — khoá nút và hiện vòng xoay. */
  busyId?: string | null;
  onReorder: (order: Order) => void;
  onOpenOrder: (order: Order) => void;
}

/** Đơn đã nhận, mới nhất trước. */
export function reorderable(orders: Order[]): Order[] {
  return orders.filter((o) => orderStep(o.status) === 3).slice(0, REORDER_LIMIT);
}

/**
 * Sheet "Đặt lại" ở Trang chủ.
 *
 * Nút "Đặt lại" trước đây chỉ mở tab Đơn hàng — nhãn hứa một hành động, bấm vào
 * ra một màn danh sách. Giờ nó đưa thẳng 5 đơn ĐÃ NHẬN gần nhất kèm nút chép vào
 * giỏ, đúng việc đại lý định làm khi bấm.
 */
export function ReorderSheet({
  visible, onClose, orders, busyId, onReorder, onOpenOrder,
}: ReorderSheetProps) {
  const rows = reorderable(orders);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Đặt lại đơn cũ">
      {rows.length === 0 ? (
        <EmptyState
          icon="refresh-outline"
          title="Chưa có đơn nào đã nhận"
          hint="Đơn đặt lại được lấy từ các đơn đã giao xong. Đơn đầu tiên nhận hàng xong sẽ hiện ở đây."
        />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {rows.map((o, i) => (
            <ListRow
              key={o.id}
              icon="cube-outline"
              title={o.id}
              subtitle={`${o.created_at.split(" ")[0]} · ${o.items.length} mẫu, ${o.items.reduce((s, it) => s + it.qty_total, 0)} đôi · ${vnd(o.subtotal)}`}
              divider={i < rows.length - 1}
              onPress={() => onOpenOrder(o)}
              trailing={
                <Pill
                  label="Mua lại"
                  tone="outline"
                  size={40}
                  loading={busyId === o.id}
                  onPress={() => onReorder(o)}
                />
              }
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.note}>
        <T variant="small" tone="muted">
          Giá và tồn kho đọc lại lúc chép vào giỏ, nên có thể khác đơn cũ.
        </T>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  note: { paddingTop: space.x3 },
});

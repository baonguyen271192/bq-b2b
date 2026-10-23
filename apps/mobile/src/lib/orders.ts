import { orderStep } from "@bq/core";
import type { Order } from "@bq/types";

/** Số đơn tối đa gợi ý đặt lại. Đủ để tìm lại đơn tháng trước, chưa thành danh sách. */
export const REORDER_LIMIT = 5;

/**
 * Đơn ĐẶT LẠI ĐƯỢC: chỉ đơn đã nhận hàng, mới nhất trước (SPEC §5-N.2).
 *
 * MỘT hàm cho cả `ReorderSheet` ở Trang chủ và khối "Đặt lại nhanh" ở giỏ trống.
 * Trước đây giỏ hàng tự lọc bằng `!orderIsOpen`, mà hàm đó trả `false` cho cả
 * đơn huỷ và đơn bị từ chối — "không còn mở" gộp chung "đã xong" với "đã hỏng".
 * Kết quả: giỏ trống gợi ý đặt lại đúng cái đơn vừa bị Sale từ chối.
 */
export function reorderableOrders(orders: readonly Order[], limit = REORDER_LIMIT): Order[] {
  return orders.filter((o) => orderStep(o.status) === 4).slice(0, limit);
}

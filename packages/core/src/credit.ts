/**
 * Suy ra hạn thanh toán từ dữ liệu đơn.
 *
 * Backend KHÔNG trả về ngày đến hạn (`packages/types/src/order.ts`): chỉ có
 * `created_at` và chuỗi `payment` kiểu "Công nợ 30 ngày". Tính ở đây thay vì bịa
 * một ngày — và trả `null` khi không suy ra được, để giao diện ẩn hẳn phần đó
 * chứ không hiện một ô trống hay một ngày sai.
 *
 * Khi backend bổ sung trường `due_date` thì bỏ cả file này và đọc thẳng.
 */

/** "Công nợ 30 ngày" -> 30. Không có số ngày (vd "Chuyển khoản") -> null. */
export const creditTermDays = (payment: string): number | null => {
  const m = payment.match(/(\d+)\s*ngày/);
  return m ? Number(m[1]) : null;
};

/** `created_at` của backend: "dd/MM/yyyy HH:mm" (xem OrderService.TIMESTAMP). */
export const parseOrderDate = (createdAt: string): Date | null => {
  const m = createdAt.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, d, mo, y, hh = "0", mm = "0"] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Ngày đến hạn = ngày tạo đơn + số ngày công nợ. `null` nếu thiếu dữ kiện. */
export const dueDateOf = (createdAt: string, payment: string): Date | null => {
  const days = creditTermDays(payment);
  const base = parseOrderDate(createdAt);
  if (days === null || !base) return null;
  const due = new Date(base);
  due.setDate(due.getDate() + days);
  return due;
};

/** "05/11" — ngày/tháng, dùng trên thẻ hạn mức và danh sách hoá đơn. */
export const dayMonth = (d: Date): string =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * Số ngày còn lại tới hạn, tính theo NGÀY ĐỊA PHƯƠNG.
 *
 * Cắt về nửa đêm giờ máy trước khi trừ: dùng mốc giờ hiện tại thì cùng một hạn
 * sẽ ra "còn 14 ngày" lúc sáng và "còn 13 ngày" lúc tối.
 */
export const daysUntil = (due: Date, now: Date = new Date()): number => {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
};

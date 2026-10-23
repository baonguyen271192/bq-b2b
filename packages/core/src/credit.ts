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

/**
 * Hoá đơn công nợ, rút gọn về đúng những trường cần để tính hạn.
 *
 * Khai ở đây thay vì nhập `Order` từ `@bq/types`: `@bq/core` không phụ thuộc gói
 * nào, và `Order` thoả cấu trúc này nên chỗ gọi không phải ép kiểu.
 */
export interface CreditInvoice {
  id: string;
  created_at: string;
  payment: string;
  subtotal: number;
  /** Backend đánh dấu ở `CreditDetail.invoices`. Thiếu = coi như chưa trả. */
  paid?: boolean;
}

export interface InvoiceRow<T extends CreditInvoice = CreditInvoice> {
  order: T;
  due: Date | null;
  /** Số ngày còn lại tới hạn; âm là đã quá hạn. `null` khi không có hạn. */
  left: number | null;
}

/**
 * Hoá đơn CHƯA thanh toán, sắp theo hạn gần nhất.
 *
 * MỘT nguồn cho cả Trang chủ và tab Công nợ. Trước đây Trang chủ tự quét
 * `api.orders()` nên vơ cả đơn đã nhận và đã trả tiền vào, rồi hiện đơn đã tất
 * toán lên thành "Hạn thanh toán" — trong khi tab Công nợ cùng lúc chỉ đúng một
 * hoá đơn khác. Hai màn nói hai số về cùng một khoản nợ.
 *
 * Đơn không suy ra được hạn (chuỗi `payment` không có số ngày) vẫn được giữ
 * trong danh sách nhưng xếp CUỐI: nó vẫn là tiền phải trả, chỉ là chưa biết khi
 * nào.
 */
export function unpaidInvoices<T extends CreditInvoice>(
  invoices: readonly T[],
  now: Date = new Date(),
): InvoiceRow<T>[] {
  return invoices
    .filter((o) => !o.paid)
    .map((order) => {
      const due = dueDateOf(order.created_at, order.payment);
      return { order, due, left: due ? daysUntil(due, now) : null };
    })
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
}

/** Hoá đơn tới hạn sớm nhất trong số chưa thanh toán. `null` nếu không có hạn nào. */
export function nextDueInvoice<T extends CreditInvoice>(
  invoices: readonly T[],
  now: Date = new Date(),
): InvoiceRow<T> | null {
  return unpaidInvoices(invoices, now).find((r) => r.due !== null) ?? null;
}

/** Tổng tiền các hoá đơn đã qua ngày đến hạn. */
export function overdueTotal(rows: readonly InvoiceRow[]): number {
  return rows
    .filter((r) => r.left !== null && r.left < 0)
    .reduce((s, r) => s + r.order.subtotal, 0);
}

/**
 * Nhãn điều khoản công nợ — MỘT nguồn cho giỏ hàng, chi tiết đơn, màn Công nợ
 * và trợ lý.
 *
 * Giỏ hàng từng ghi cứng "Công nợ 30 ngày" trong khi đơn gửi đi xong trả về
 * đúng chữ "Công nợ": app hứa 30 ngày rồi tự rút lời. Không có số ngày thì nói
 * "Công nợ", không đoán thêm.
 *
 * TODO(api): điều khoản thật nằm ở hợp đồng đại lý, `GET /api/dealers/{code}`
 * chưa trả trường nào cho nó (xem `Dealer.payment_term`). Khi có, truyền thẳng
 * giá trị đó vào đây.
 */
export const paymentLabel = (payment?: string | null): string => {
  const days = payment ? creditTermDays(payment) : null;
  return days === null ? "Công nợ" : `Công nợ ${days} ngày`;
};

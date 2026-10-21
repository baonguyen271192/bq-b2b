/**
 * Đơn LẺ (khách vãng lai qua bot Facebook/Zalo).
 *
 * BQ sở hữu dữ liệu này: `apps/api-java` ports/RetailOrderPort, đọc qua
 * `/api/retail/*`. Trước đây nằm ở một service Commerce đa khách hàng bên ngoài —
 * xem docs/adr/0003-retail-orders-in-bq.md.
 */
export interface RetailOrderItem {
  code: string;
  name: string;
  sizes: Record<string, number>;
  unit_price: number;
  qty_total: number;
  line_total: number;
}

export interface RetailOrder {
  id: string;
  items: RetailOrderItem[];
  subtotal: number;
  payment: string;
  status: string;
  channel: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  flagged?: number | boolean;
  flag_note?: string | null;
  /** Mã người gửi của kênh chat (Facebook PSID...) — nối lại hội thoại khi cần. */
  sender_id?: string | null;
  /** Chỉ có giá trị khi đã thu tiền; "cần hoàn tiền" sau khi huỷ đơn đã thu. */
  payment_status?: string | null;
}

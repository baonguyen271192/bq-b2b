/**
 * Đơn LẺ (khách vãng lai qua bot Facebook/Zalo).
 * Nguồn dữ liệu là service Commerce độc lập — BQ KHÔNG giữ DB riêng cho đơn lẻ,
 * chỉ đọc/thao tác qua proxy `/commerce-api`.
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
  store_id: string;
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
}

export interface Analytics {
  gmv_total: number;
  orders_total: number;
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  top_products: { name: string; pairs: number }[];
  low_stock: { code: string; name: string; size: string; stock: number }[];
  total_outstanding: number;
  aging: { code: string; name: string; outstanding: number }[];
  aging_buckets: { label: string; amount: number; count: number }[];
}

/** Thẻ đơn rút gọn do trợ lý AI của sale trả về (amount đã format sẵn). */
export interface SaleOrderCard {
  id: string;
  who: string;
  channel: string;
  product: string;
  pairs: number;
  amount: string;
  status: string;
  over_limit: boolean;
  created_at: string;
}

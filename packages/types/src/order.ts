export interface OrderItem {
  code: string;
  name: string;
  /** size -> số lượng đặt */
  sizes: Record<string, number>;
  unit_price: number;
  qty_total: number;
  line_total: number;
}

/** Đơn SỈ (đại lý). `over_limit` = vượt hạn mức công nợ → cần duyệt. */
export interface Order {
  id: string;
  dealer_code: string;
  dealer_name: string;
  items: OrderItem[];
  subtotal: number;
  delivery: string;
  payment: string;
  status: string;
  channel: string;
  over_limit: boolean;
  created_at: string;
  approver?: string;
  approve_note?: string;
}

export interface OrderLineInput {
  code: string;
  sizes: Record<string, number>;
}

export interface CreateOrderInput {
  dealer_code: string;
  lines: OrderLineInput[];
  delivery?: string;
  payment?: string;
  channel?: string;
}

export interface CreditDetail {
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  invoices: (Order & { paid?: boolean })[];
  transactions: import("./dealer").Payment[];
}

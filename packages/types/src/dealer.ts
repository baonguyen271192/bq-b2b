/** Đại lý sỉ (B2B). Hạn mức công nợ do BQ cấp theo bậc. */
export interface Dealer {
  code: string;
  name: string;
  tier: string;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  owner?: string;
  phone?: string;
  email?: string;
  invoice_address?: string;
}

/** Trường đại lý mà admin được phép sửa. */
export type DealerPatch = Partial<
  Pick<Dealer, "tier" | "credit_limit" | "owner" | "phone" | "email" | "invoice_address">
>;

export interface Payment {
  id: string;
  dealer_code: string;
  order_id: string;
  amount: number;
  method: string;
  created_at: string;
}

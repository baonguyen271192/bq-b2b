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
  /**
   * Điều khoản công nợ theo hợp đồng, vd "Công nợ 30 ngày".
   *
   * TODO(api): `GET /api/dealers/{code}` CHƯA trả trường này — đã hỏi BQ (câu 3
   * trong `docs/sap-b1-mapping-proposal.md` A7). Cho tới lúc đó mọi nơi hiện
   * "Công nợ" trống số ngày qua `paymentLabel()` của `@bq/core`, thay vì mỗi màn
   * đoán một kiểu.
   */
  payment_term?: string;
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

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
  /**
   * Ba trường dưới đây backend CHƯA trả về — xem A8 trong
   * `docs/sap-b1-mapping-proposal.md`. Khai `optional` để giao diện ẩn đúng
   * phần thiếu thay vì hiện ô trống hoặc "—" (SPEC §5-M).
   */
  /** Mã số thuế, in trên hoá đơn VAT. */
  tax_code?: string;
  /** Phần trăm chiết khấu theo hạng, vd 20. */
  discount_percent?: number;
  /** Sale phụ trách đại lý này. */
  sales_rep?: { name: string; phone: string };
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

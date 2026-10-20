import type { Dealer } from "@bq/types";

/** Tỷ lệ hạn mức đã dùng (0..1), chặn chia cho 0 khi hạn mức = 0. */
export const creditUsageRatio = (dealer: Dealer): number =>
  dealer.credit_limit > 0 ? dealer.credit_used / dealer.credit_limit : 0;

/** Một đơn có vượt hạn mức khả dụng không → quyết định có phải chờ duyệt. */
export const exceedsCredit = (dealer: Dealer, orderTotal: number): boolean =>
  orderTotal > dealer.credit_available;

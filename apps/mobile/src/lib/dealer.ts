import type { Dealer } from "@bq/types";

/**
 * Cách hiển thị thông tin đại lý khi backend CHƯA có đủ trường (SPEC §5-M).
 *
 * Quy tắc chung: trường nào không có dữ liệu thì ẨN HẲN, không hiện ô trống,
 * không hiện "—". Một nhãn "MST —" trên màn hồ sơ trông như dữ liệu bị mất,
 * trong khi thật ra BQ chưa bao giờ gửi nó.
 */

/**
 * Nhãn chip hạng: ghi kèm % chiết khấu KHI CÓ số thật.
 *
 * TODO(api): `Dealer.discount_percent` chưa được backend trả về — xem A8 trong
 * `docs/sap-b1-mapping-proposal.md`. Thiết kế ghi "Hạng Vàng, CK 20%".
 */
export function tierLabel(dealer: Dealer): string {
  return dealer.discount_percent != null
    ? `Hạng ${dealer.tier}, CK ${dealer.discount_percent}%`
    : `Hạng ${dealer.tier}`;
}

/**
 * Dòng định danh dưới tên đại lý: mã, kèm MST khi có.
 *
 * TODO(api): `Dealer.tax_code` chưa có. Gắn nhãn MST cho một trường khác (từng
 * có lúc lấy `email`) là dựng thông tin sai trên chứng từ.
 */
export function dealerIdLine(dealer: Dealer): string {
  return dealer.tax_code ? `${dealer.code}, MST ${dealer.tax_code}` : dealer.code;
}

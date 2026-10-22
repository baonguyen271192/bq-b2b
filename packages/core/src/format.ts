/**
 * Format tiền VND. Dùng dấu chấm phân cách nghìn theo quy ước kế toán VN.
 * Không dùng Intl.NumberFormat style:"currency" vì React Native (Hermes) build
 * không-ICU trả về ký hiệu khác nhau giữa iOS/Android.
 */
export const vnd = (n: number): string =>
  n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";

/** Tổng số đôi trong một bảng size. */
export const totalPairs = (sizes: Record<string, number>): number =>
  Object.values(sizes).reduce((sum, qty) => sum + qty, 0);

/** Bỏ ",0" thừa: 500,0 -> "500". Dùng dấu phẩy thập phân theo quy ước VN. */
const trim1 = (n: number): string => n.toFixed(1).replace(".", ",").replace(/,0$/, "");

/**
 * Tiền rút gọn cho chỗ hẹp: `312.400.000` -> `"312,4 tr"`, `1.200.000.000` -> `"1,2 tỷ"`.
 *
 * Mốc "tỷ" đặt ở 1e9 chứ không sớm hơn: hạn mức 500 triệu phải đọc là "500 tr",
 * viết "0,5 tỷ" thì mắt phải quy đổi thêm một lần.
 */
export const vndShort = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trim1(n / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${trim1(n / 1_000_000)} tr`;
  return vnd(n);
};

/** Rút gọn theo nghìn cho chip rất hẹp: `270.000` -> `"270k"`, `1.200.000` -> `"1,2tr"`. */
export const vndK = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim1(n / 1_000_000)}tr`;
  return `${Math.round(n / 1000)}k`;
};

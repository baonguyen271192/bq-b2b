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

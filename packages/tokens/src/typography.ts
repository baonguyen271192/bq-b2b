/**
 * Họ font Be Vietnam Pro. Tên khớp với khoá `useFonts` của
 * `@expo-google-fonts/be-vietnam-pro` — đổi một bên phải đổi cả hai.
 */
export const fontFamily = {
  regular: "BeVietnamPro_400Regular",
  medium: "BeVietnamPro_500Medium",
  semibold: "BeVietnamPro_600SemiBold",
  bold: "BeVietnamPro_700Bold",
  extrabold: "BeVietnamPro_800ExtraBold",
} as const;

export type FontWeightToken = keyof typeof fontFamily;

/**
 * Thang chữ — theo `docs/design/v2/SPEC.md` §1.
 *
 * `weight` là khoá trong {@link fontFamily}, KHÔNG phải số: Android bỏ qua
 * `fontWeight` khi dùng font tuỳ biến, nên weight phải đi qua tên file font.
 * Khai số ở đó sẽ ra chữ mảnh trên Android mà iOS vẫn đúng — lỗi chỉ lộ trên
 * máy thật.
 *
 * SÀN 13px cho mọi chữ MANG THÔNG TIN (SPEC mục 5.B, không ngoại lệ). Chỉ
 * `chip` được 12 và chỉ `badge` được 11 — hai cái đó là nhãn trang trí cho một
 * thông tin đã hiện ở chỗ khác.
 */
export const textStyle = {
  /** Số tiền lớn trên thẻ hạn mức / công nợ. */
  amountHero: { fontSize: 34, lineHeight: 38, weight: "extrabold", letterSpacing: -1.2 },
  /** Tiêu đề màn tab (Sản phẩm, Đơn hàng…), tiêu đề màn Đăng nhập, số tiền QR. */
  screenTitle: { fontSize: 30, lineHeight: 36, weight: "extrabold", letterSpacing: -1 },
  /** Giá ở màn Chi tiết sản phẩm. */
  amountLg: { fontSize: 26, lineHeight: 32, weight: "extrabold", letterSpacing: -0.8 },
  /** Tổng ở dock màn Giỏ hàng. */
  amountMd: { fontSize: 24, lineHeight: 30, weight: "extrabold", letterSpacing: -0.6 },
  /** Tổng ở dock màn Chi tiết và sheet Đặt nhanh. */
  amountSm: { fontSize: 22, lineHeight: 28, weight: "extrabold", letterSpacing: -0.5 },
  /** Tên đại lý, tiêu đề màn có nút back, tên sản phẩm ở Chi tiết. */
  title: { fontSize: 20, lineHeight: 26, weight: "bold", letterSpacing: -0.4 },
  /** Tiêu đề section ("Bán chạy tuần này"). */
  section: { fontSize: 18, lineHeight: 24, weight: "bold", letterSpacing: -0.3 },
  /** Tiêu đề card nhỏ, tổng tiền trong card. */
  cardTitle: { fontSize: 16, lineHeight: 22, weight: "bold", letterSpacing: 0 },
  /** Chữ thân, chữ trên nút. */
  body: { fontSize: 15, lineHeight: 22, weight: "regular", letterSpacing: 0 },
  /** Chữ thân nhấn: nhãn nút, tiêu đề dòng trong list. */
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: "semibold", letterSpacing: 0 },
  /** Nhãn field, chip danh mục, tên sản phẩm trong lưới, người nhận. */
  label: { fontSize: 14, lineHeight: 20, weight: "semibold", letterSpacing: 0 },
  /** Chữ phụ: ngày, tồn kho, ghi chú, địa chỉ. SÀN của chữ mang thông tin. */
  small: { fontSize: 13, lineHeight: 18, weight: "regular", letterSpacing: 0 },
  /** Chip, tag trạng thái, chip size. KHÔNG dùng cho chữ mang thông tin. */
  chip: { fontSize: 12, lineHeight: 16, weight: "semibold", letterSpacing: 0 },
  /** Badge số trên icon. Nhỏ nhất được phép, và chỉ cho số. */
  badge: { fontSize: 11, lineHeight: 14, weight: "bold", letterSpacing: 0 },
} as const;

export type TextStyleToken = keyof typeof textStyle;

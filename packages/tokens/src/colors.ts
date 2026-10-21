/**
 * Bảng màu BQ. Cam là màu thương hiệu, KHÔNG phải màu nhấn phụ.
 *
 * Tỉ lệ tương phản ghi kèm đo theo WCAG 2.1 trên nền tương ứng — đọc trước khi
 * đặt chữ lên bất kỳ nền cam nào.
 */
export const color = {
  // --- Thương hiệu ---------------------------------------------------------
  /** Màu chủ đạo: CTA chính, tab đang chọn, thẻ hạn mức. Chữ trắng trên nền này
   *  chỉ đạt 3.56:1 → BẮT BUỘC cỡ ≥ 15px và weight ≥ 600. */
  bq: "#E65C00",
  /** Trạng thái nhấn của CTA, điểm cuối gradient. Chữ trắng đạt 5.23:1 — an toàn
   *  cho cả chữ nhỏ. */
  bqDeep: "#B84A00",
  /** Điểm ĐẦU gradient. Chữ trắng chỉ đạt 2.61:1 → KHÔNG đặt chữ lên màu này,
   *  kể cả chữ lớn. */
  bqBright: "#FF7A1A",
  /** Nền chip/badge cam. Chữ ink trên nền này đạt 15.10:1. */
  bqTint: "#FDEBDD",
  /** Dải sáng lướt qua logo trắng ở splash. KHÔNG dùng làm nền hay màu chữ: đây
   *  là màu PHỦ LÊN mặt trắng để tạo vệt ấm nên nó cố tình gần trắng (chữ trắng
   *  trên nó chỉ đạt 1.07:1). Trắng tinh không dùng được: phủ trắng lên trắng thì
   *  không thấy gì — đo trên video bản Release, biên độ chỉ 0.6/255. */
  bqShine: "#FFE7C2",

  // --- Nền và chữ ----------------------------------------------------------
  /** Chữ chính, và nền của những khối cố ý tối (tab bar). */
  ink: "#1C1915",
  /** Nền màn hình. */
  canvas: "#F7F6F4",
  /** Nền card. */
  paper: "#FFFFFF",
  /**
   * Nền đặt ảnh giày.
   *
   * ĐO TỪ ẢNH THẬT, không chọn theo cảm tính: 5 ảnh trong catalog cho
   * #EFEFEF–#F1F1F1 ở cả bốn góc (GBW0295, SDW0155, GIW0208, SDW0136, SA003).
   * Lệch một chút là thấy ngay viền quanh giày, nên giá trị này phải bám theo
   * ảnh nguồn — đổi nhà cung cấp ảnh thì đo lại.
   */
  plate: "#F0F0F0",
  /** Đường kẻ, hairline. */
  line: "#E7E4DF",

  /** Chữ phụ. 4.28:1 trên canvas — đạt chữ lớn, không đạt chữ nhỏ. */
  muted: "#7A746C",
  /** Chữ mờ nhất. 2.53:1 trên paper — KHÔNG đạt cả chữ lớn. Chỉ dùng cho chữ
   *  trang trí (số 0 trong Stepper), không dùng cho thông tin. */
  faint: "#A8A29A",

  // --- Trạng thái ----------------------------------------------------------
  ok: "#1F8A5B",
  okTint: "#E6F4EC",
  warn: "#B86E00",
  warnTint: "#FDF0DC",
  info: "#2F5FD0",
  infoTint: "#E7EDFB",
  danger: "#C2362B",
  dangerTint: "#FBE9E7",

  /** Trắng/đen có alpha — dùng cho lớp phủ trên ảnh và trên nền cam. */
  white: "#FFFFFF",
  whiteA: (a: number) => `rgba(255,255,255,${a})`,
  blackA: (a: number) => `rgba(0,0,0,${a})`,
} as const;

export type ColorToken = keyof typeof color;

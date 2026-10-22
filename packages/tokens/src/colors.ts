/**
 * Bảng màu BQ — theo `docs/design/v2/SPEC.md` §1 và các quyết định mục 5.
 *
 * Tỉ lệ tương phản ghi kèm đo theo WCAG 2.1 trên nền tương ứng. Đọc trước khi
 * đặt chữ lên bất kỳ nền màu nào: đây là lý do tồn tại của phần lớn comment
 * trong file này.
 *
 * Quy tắc một dòng (SPEC mục 5.A): **cam làm NỀN là `brand`, cam làm CHỮ trên
 * nền sáng là `textBrand`.** Nhầm hai cái này là lỗi tương phản, không phải lỗi
 * thẩm mỹ.
 */
export const color = {
  // --- Nền và chữ ----------------------------------------------------------
  /** Chữ chính, và nền của những khối cố ý tối (tab bar, nút phụ, puck size). */
  ink: "#1C1915",
  /** Chữ phụ. 5.29:1 trên `canvas`, 5.76:1 trên `paper`, 5.02:1 trên `subtle`
   *  — đạt AA cho cả chữ thường. KHÔNG dùng xám nhạt hơn cho chữ. */
  muted: "#6B655D",
  /** Viền ô nhập, viền chip, vạch tồn kho trống. */
  line: "#E8E5E0",
  /** Đường kẻ giữa các dòng BÊN TRONG một card — nhạt hơn `line` để không cắt
   *  card thành nhiều mảnh rời. */
  divider: "#EFECE8",
  /** Nền màn hình. */
  canvas: "#F6F5F3",
  /** Nền card, dock đáy, bottom sheet. */
  paper: "#FFFFFF",
  /** Nền icon tròn trong list, stepper khi = 0, chip size trong giỏ. */
  subtle: "#F1EFEC",
  /**
   * Nền rãnh của SegmentedControl. SPEC §2 cho hex này nhưng §1 không có token
   * tương ứng — thêm ở đây để không ai phải gõ hex trong component.
   */
  track: "#ECEAE6",
  /**
   * Nền đặt ảnh giày.
   *
   * SPEC §1 ghi `#EAECF0`; quyết định mục 5.J BỎ giá trị đó. ĐO TỪ ẢNH THẬT,
   * không chọn theo cảm tính: 5 ảnh trong catalog cho #EFEFEF–#F1F1F1 ở cả bốn
   * góc (GBW0295, SDW0155, GIW0208, SDW0136, SA003). Lệch một chút là thấy ngay
   * viền quanh giày — đổi nhà cung cấp ảnh thì đo lại.
   */
  plate: "#F0F0F0",

  // --- Thương hiệu ---------------------------------------------------------
  /**
   * MỌI nền cam có chữ trắng: CTA chính, tab đang chọn, thẻ hạn mức/công nợ,
   * badge, nút gọi. Chữ trắng đạt 4.79:1 — đủ cho cả chữ thường.
   *
   * KHÔNG dùng làm màu chữ: `brand` trên `canvas` chỉ 4.40:1 và trên `tint`
   * 4.19:1, cả hai đều trượt AA. Dùng `textBrand`.
   */
  brand: "#C24E00",
  /** Trạng thái nhấn của `brand`. Chữ trắng 6.64:1. */
  brandDeep: "#9E3F00",
  /**
   * Cam làm CHỮ trên nền sáng (SPEC mục 5.A): link "Đăng ký ngay", chip
   * "Size 41 ×", tag "Giá hạng Vàng", tag "Mặc định", chữ "Thanh toán" trên nút
   * trắng. 6.09:1 trên `canvas`, 5.81:1 trên `tint`, 6.64:1 trên `paper`.
   *
   * Cùng giá trị với `brandDeep` nhưng là token NGỮ NGHĨA riêng: đổi màu nhấn
   * sau này không được kéo theo màu chữ, và ngược lại.
   */
  textBrand: "#9E3F00",
  /**
   * Cam SÁNG, chỉ cho chỗ KHÔNG có chữ nhỏ: splash, mảng cam header màn Đăng
   * nhập (chỉ chứa logo 72px), chấm tiến trình đang chạy. Chữ trắng chỉ đạt
   * 3.56:1 — hợp lệ cho chữ lớn, không hợp lệ cho chữ thường.
   *
   * SPEC mục 5.E: cam logo chính thức (#F04F23?) CHƯA chốt. Giữ đúng MỘT token
   * này để khi có brand guideline thì đổi một chỗ là xong.
   */
  flame: "#E65C00",
  /**
   * Cặp tối của `flame`, chỉ dùng trong splash (lớp nền tràn dưới ảnh radial và
   * chấm nhịp). KHÔNG phải `brandDeep`: splash đã chốt hình, đổi màu nền của nó
   * là đổi thứ đã duyệt. Đổi `flame` thì phải đổi cả đây.
   */
  flameDeep: "#B84A00",
  /** Nền chip/tag cam nhạt, vòng sáng quanh chấm tiến trình. `textBrand` trên
   *  nền này đạt 5.81:1; `ink` đạt 15.10:1. */
  tint: "#FDEDE2",
  /**
   * Dải sáng lướt qua logo trắng ở splash. KHÔNG dùng làm nền hay màu chữ: đây
   * là màu PHỦ LÊN mặt trắng nên nó cố tình gần trắng (chữ trắng trên nó chỉ
   * đạt 1.07:1). Trắng tinh không dùng được: phủ trắng lên trắng thì không thấy
   * gì — đo trên video bản Release, biên độ chỉ 0.6/255.
   */
  shine: "#FFE7C2",

  // --- Trạng thái ----------------------------------------------------------
  /** Lãi, đã nhận hàng, đủ hạn mức, tiền vào. 5.85:1 trên `paper`. */
  ok: "#17734A",
  okTint: "#E3F3EA",
  /** Chờ duyệt, sắp đến hạn, ghi chú quan trọng. 6.33:1 trên `paper`. */
  warn: "#8A5300",
  warnTint: "#FBEFD9",
  /** Đang giao, icon xe tải, avatar Sale. 7.21:1 trên `paper`. */
  info: "#2350B8",
  infoTint: "#E5ECFB",
  /** Vượt hạn mức, đăng xuất, sắp hết hàng. 6.57:1 trên `paper`. */
  danger: "#B42318",
  dangerTint: "#FDECEA",
  /**
   * Vạch tồn kho mức TRUNG BÌNH (15–49 đôi). CHỈ dùng cho vạch, KHÔNG dùng cho
   * chữ: 3.99:1 trên `paper` — đạt ngưỡng 3:1 của thành phần đồ hoạ, trượt
   * ngưỡng 4.5:1 của chữ thường.
   */
  stockMid: "#B86E00",

  // --- Phủ -----------------------------------------------------------------
  white: "#FFFFFF",
  /** Trên nền `brand`: track tiến độ 0.28, đường chỉ khâu 0.32. */
  whiteA: (a: number) => `rgba(255,255,255,${a})`,
  /** Trên nền `brand`: chip/khối phụ 0.18. */
  blackA: (a: number) => `rgba(0,0,0,${a})`,
  /** Lớp mờ sau bottom sheet: 0.5. */
  inkA: (a: number) => `rgba(28,25,21,${a})`,
} as const;

export type ColorToken = keyof typeof color;

/** Spacing bội số 4. Lề màn hình luôn là `screen`. */
export const space = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x7: 28,
  x8: 32,
  x10: 40,
  x12: 48,
  /** Lề trái/phải của mọi màn hình (SPEC §1). */
  screen: 20,
} as const;

/**
 * Bo góc THEO CẤP, không dùng một bán kính cho mọi thứ — theo SPEC §1.
 *
 * Cấp bậc có ý nghĩa thị giác: khối càng lớn, bo càng mềm. Dùng `card` cho một
 * cái chip sẽ làm chip trông như card thu nhỏ.
 */
export const radius = {
  /** Header cam màn Đăng nhập — chỉ bo 2 góc DƯỚI. */
  loginHeader: 36,
  /** Thẻ hạn mức / công nợ. Đường chỉ khâu bên trong bo {@link stitch}. */
  credit: 28,
  /** Dock đáy và bottom sheet — chỉ bo 2 góc TRÊN. */
  sheet: 28,
  /** Đường chỉ khâu nét đứt bên trong thẻ hạn mức (cách mép 7). */
  stitch: 22,
  /** Card nội dung, và ảnh sản phẩm trong lưới. */
  card: 22,
  /** Ô thao tác nhanh ở Trang chủ. */
  action: 20,
  /** RadioCard, DashedButton, thumbnail lớn, khối phụ trong thẻ hạn mức. */
  option: 18,
  /** Ô nhập, ô tìm kiếm, Select. */
  field: 16,
  /** Thumbnail nhỏ trong list và card sản phẩm của đơn. */
  thumb: 14,
  /** Chip size trong giỏ ("39 ×8"). */
  chip: 8,
  /** Chip lãi ("Lãi 270k") — nhỏ nhất, gần như vuông. */
  marginChip: 7,
  /** Nút, chip lọc, tag trạng thái, stepper, avatar LUÔN là viên thuốc. */
  pill: 999,
} as const;

/** Chiều cao vùng chạm tối thiểu — dưới mức này là lỗi khả dụng (SPEC §1). */
export const hitSize = 44;

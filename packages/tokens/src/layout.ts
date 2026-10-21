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
  /** Lề trái/phải của mọi màn hình. */
  screen: 20,
} as const;

/**
 * Bo góc THEO CẤP, không dùng một bán kính cho mọi thứ.
 *
 * Cấp bậc có ý nghĩa thị giác: khối càng lớn, bo càng mềm. Dùng `card` cho một
 * cái chip sẽ làm chip trông như card thu nhỏ.
 */
export const radius = {
  /** Khối ảnh sản phẩm — mềm nhất. */
  plate: 28,
  /** Card nội dung. */
  card: 22,
  /** Ô nhập, ô tìm kiếm. */
  field: 16,
  /** Chip, tag. */
  chip: 12,
  /** Nút LUÔN là viên thuốc. */
  pill: 999,
} as const;

/** Chiều cao vùng chạm tối thiểu — dưới mức này là lỗi khả dụng. */
export const hitSize = 44;

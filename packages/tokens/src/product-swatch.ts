/**
 * Màu VẬT LÝ của giày — KHÔNG phải màu của design system.
 *
 * Tách khỏi `colors.ts` có chủ đích: bảng dưới đây mô tả màu da/vải có thật của
 * sản phẩm, nên nó không tuân và không được tuân bất kỳ ràng buộc tương phản nào
 * của bộ token. Trộn vào `color` thì lần sau có người dùng `color.nau` làm nền
 * cho chữ.
 *
 * Backend trả TÊN màu (`Product.colors: string[]`), không trả mã. Bảng này chỉ
 * phục vụ cái chấm nhỏ cạnh tên; tên chữ luôn hiện kèm nên màu lạ vẫn đọc được.
 */
const SWATCH: Record<string, string> = {
  "đen": "#1C1915",
  "trắng": "#F2F2F0",
  "kem": "#EBE0CB",
  "nâu": "#6B4226",
  "nâu bò": "#8A5A2B",
  "nâu hạt": "#5A3B22",
  "xám": "#8E8E8E",
  "be": "#D9C7A7",
  "đỏ": "#B42318",
  "cam": "#E65C00",
  "hồng": "#E8A0A8",
  "vàng": "#E0B24A",
  "xanh dương": "#2350B8",
  "xanh lá": "#17734A",
  "bạc": "#C9C9C9",
  "vàng đồng": "#B08D57",
};

/** Mã màu để vẽ chấm cạnh tên màu. `null` = không biết, hãy vẽ chấm viền trung tính. */
export const productSwatch = (name: string): string | null =>
  SWATCH[name.trim().toLowerCase()] ?? null;

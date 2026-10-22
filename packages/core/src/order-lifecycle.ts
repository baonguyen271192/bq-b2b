/**
 * Vòng đời đơn. Chuỗi trạng thái do BACKEND quyết định (tiếng Việt, trả thẳng từ
 * `api.py`) — các map dưới đây chỉ là nhãn NÚT cho bước kế tiếp, không phải nguồn
 * sự thật của trạng thái. Khi đổi backend thật, đối chiếu lại với enum của BE.
 */

/** Đơn SỈ: có bước duyệt hạn mức công nợ. */
const WHOLESALE_NEXT_ACTION: Record<string, string> = {
  "Chờ xác nhận": "Xác nhận",
  "Đã xác nhận": "Đóng gói",
  "Đang đóng gói": "Bàn giao",
  "Đang bàn giao vận chuyển": "Xác nhận hộ đại lý",
};

/** Đơn LẺ: vòng đời ngắn hơn, không có bước duyệt. */
const RETAIL_NEXT_ACTION: Record<string, string> = {
  "Chờ xác nhận": "Xác nhận",
  "Đang đóng gói": "Giao hàng",
  "Đang giao": "Hoàn tất",
};

/**
 * Nhãn nút "bước tiếp theo" cho đơn SỈ, `null` nếu đã ở trạng thái cuối.
 * Bước cuối đại lý tự xác nhận trong app của họ; nút ở admin chỉ để BQ làm HỘ
 * khi đại lý báo qua điện thoại/Zalo.
 */
export const nextActionLabel = (status: string): string | null =>
  WHOLESALE_NEXT_ACTION[status] ?? null;

/** Nhãn nút "bước tiếp theo" cho đơn LẺ, `null` nếu đã ở trạng thái cuối. */
export const retailNextActionLabel = (status: string): string | null =>
  RETAIL_NEXT_ACTION[status] ?? null;

/**
 * Bốn bước hiển thị trên thẻ "đơn đang giao" ở Trang chủ (SPEC §3.2 mục 4).
 *
 * KHÔNG phải nguồn sự thật: backend có 5 trạng thái, thiết kế chỉ vẽ 4 chấm, nên
 * ba trạng thái giữa ("Đã xác nhận", "Đang đóng gói", "Đang bàn giao vận chuyển")
 * gộp chung vào một chấm. Chữ trạng thái đầy đủ vẫn hiện ở `StatusTag` của màn
 * Đơn hàng — chấm chỉ để liếc qua là biết đang ở khúc nào.
 */
export const ORDER_STEPS = ["Đặt", "Duyệt", "Đang giao", "Nhận"] as const;

/** Chỉ số bước HIỆN TẠI trong {@link ORDER_STEPS}; -1 nếu đơn đã huỷ/bị từ chối. */
export const orderStep = (status: string): number => {
  const s = status.toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("từ chối")) return -1;
  if (s.includes("đã nhận")) return 3;
  if (s.includes("chờ xác nhận") || s.includes("chờ duyệt")) return 1;
  return 2;
};

/** Đơn đã khép lại thì không cần hiện trên Trang chủ nữa. */
export const orderIsOpen = (status: string): boolean => {
  const step = orderStep(status);
  return step >= 0 && step < 3;
};

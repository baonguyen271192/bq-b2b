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
 * NĂM bước của dòng thời gian đơn, khớp 1-1 với trạng thái backend (SPEC §3.8).
 *
 * Bản cũ chỉ có bốn chấm và gộp ba trạng thái giữa ("Đã xác nhận", "Đang đóng
 * gói", "Đang bàn giao vận chuyển") vào một chấm "Đang giao" — đơn còn trong
 * kho đóng gói vẫn sáng chấm "Đang giao", tức app nói SAI chứ không chỉ nói gọn.
 */
export const ORDER_STEPS = [
  "Gửi đơn",
  "BQ xác nhận",
  "Đang đóng gói",
  "Bàn giao vận chuyển",
  "Đã nhận hàng",
] as const;

/** Nhãn ngắn cho thẻ đơn ở Trang chủ, nơi năm chấm phải vừa một hàng. */
export const ORDER_STEPS_SHORT = ["Đặt", "Duyệt", "Đóng gói", "Bàn giao", "Nhận"] as const;

/** Đơn đang chờ Sale duyệt hạn mức — bước 2 đổi nhãn và dùng màu warn. */
export const orderAwaitingApproval = (status: string): boolean =>
  status.toLowerCase().includes("chờ duyệt");

/**
 * Chỉ số bước HIỆN TẠI trong {@link ORDER_STEPS}; -1 nếu đơn đã huỷ/bị từ chối.
 *
 * "Đã xác nhận" trả 2: bước "BQ xác nhận" đã xong, việc đang tới là đóng gói.
 */
export const orderStep = (status: string): number => {
  const s = status.toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("từ chối")) return -1;
  if (s.includes("đã nhận") || s.includes("hoàn tất")) return 4;
  if (s.includes("bàn giao") || s.includes("đang giao")) return 3;
  if (s.includes("đóng gói") || s.includes("đã xác nhận")) return 2;
  // Còn lại là khúc đầu: "Chờ xác nhận", "Chờ duyệt (vượt hạn mức)".
  return 1;
};

/** Đơn đã khép lại thì không cần hiện trên Trang chủ nữa. */
export const orderIsOpen = (status: string): boolean => {
  const step = orderStep(status);
  return step >= 0 && step < 4;
};

/**
 * Nhãn trạng thái NGẮN để đặt trong tag.
 *
 * Backend trả "Chờ duyệt (vượt hạn mức)" — 24 ký tự. Đặt cạnh tiêu đề màn thì
 * đẩy "Chi tiết đơn" xuống hai dòng ở khổ 393, và trong danh sách đơn thì tag
 * chiếm gần nửa hàng. Phần trong ngoặc là LÝ DO, thuộc về nội dung màn chứ
 * không phải cái tag.
 */
export const statusLabel = (status: string): string =>
  status.replace(/\s*\([^)]*\)\s*$/, "").trim() || status;

/** Phần trong ngoặc của chuỗi trạng thái, vd "vượt hạn mức". `null` nếu không có. */
export const statusReason = (status: string): string | null =>
  status.match(/\(([^)]*)\)\s*$/)?.[1]?.trim() ?? null;

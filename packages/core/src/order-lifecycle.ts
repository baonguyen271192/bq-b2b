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

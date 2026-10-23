import Constants from "expo-constants";
import type { Dealer } from "@bq/types";

/**
 * Người đại lý gọi khi cần giúp.
 *
 * Quy tắc một chỗ (SPEC §5-M.3): có Sale phụ trách thì nút gọi trỏ thẳng Sale;
 * không có thì rơi về tổng đài BQ. KHÔNG màn nào tự chốt cứng số điện thoại —
 * trước đây `02363745745` nằm rải ở ba file, đổi số là chắc chắn sót một chỗ.
 */
export interface SupportContact {
  /** Nhãn nút: "Gọi Trần Thu Hà" hoặc "Gọi tổng đài BQ". */
  label: string;
  name: string;
  phone: string;
  /** `true` khi đây là Sale phụ trách thật, `false` khi là tổng đài dự phòng. */
  isSalesRep: boolean;
}

/**
 * Số tổng đài, đọc từ `app.json` › `expo.extra.supportPhone`.
 *
 * `null` khi CHƯA cấu hình — chỗ gọi phải ẩn nút/hàng gọi, không được hiện một
 * số giả (SPEC §5-M.3). KHÔNG có giá trị dự phòng chốt cứng ở đây: một số điện
 * thoại sai còn tệ hơn không có số, vì đại lý sẽ gọi nó.
 *
 * TODO(api): số thật của BQ chưa được xác nhận — số đang cấu hình lấy từ ảnh
 * thiết kế `11-Profile.png` (xem A8 trong `docs/sap-b1-mapping-proposal.md`).
 */
export const SUPPORT_HOTLINE: string | null =
  (Constants.expoConfig?.extra?.supportPhone as string | undefined)?.trim() || null;

/**
 * Người hỗ trợ cho đại lý này, hoặc `null` khi không có ai gọi được — không Sale
 * phụ trách mà cũng chưa cấu hình tổng đài.
 */
export function supportContact(dealer?: Dealer | null): SupportContact | null {
  const rep = dealer?.sales_rep;
  if (rep?.name && rep.phone) {
    return { label: `Gọi ${rep.name}`, name: rep.name, phone: rep.phone, isSalesRep: true };
  }
  if (!SUPPORT_HOTLINE) return null;
  return {
    label: "Gọi tổng đài BQ",
    name: "Tổng đài BQ",
    phone: SUPPORT_HOTLINE,
    isSalesRep: false,
  };
}

/**
 * Tổng đài BQ, tách riêng khỏi {@link supportContact}.
 *
 * Hàng "Gọi tổng đài BQ" ở Hồ sơ LUÔN hiện, kể cả khi đã có Sale phụ trách
 * (SPEC §5-M.3): Sale có thể không nghe máy, và lúc đó đại lý cần một số khác
 * ngay trên cùng màn chứ không phải đi tìm.
 */
export function hotlineContact(): SupportContact | null {
  if (!SUPPORT_HOTLINE) return null;
  return {
    label: "Gọi tổng đài BQ",
    name: "Tổng đài BQ",
    phone: SUPPORT_HOTLINE,
    isSalesRep: false,
  };
}

/** Số đã nhóm cho dễ đọc: "02363745745" → "0236 374 5745". */
export function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return phone;
}

/** `tel:` đã bỏ khoảng trắng — nhiều máy không gọi được nếu còn dấu cách. */
export const telUrl = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

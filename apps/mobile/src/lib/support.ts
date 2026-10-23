import Constants from "expo-constants";
import type { Dealer } from "@bq/types";

/**
 * Người đại lý gọi khi cần giúp.
 *
 * Quy tắc một chỗ (SPEC §5-M): có Sale phụ trách thì gọi thẳng Sale; không có
 * thì rơi về tổng đài BQ. KHÔNG màn nào tự chốt cứng số điện thoại — trước đây
 * `02363745745` nằm rải ở ba file, đổi số là chắc chắn sót một chỗ.
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
 * TODO(api): số thật của BQ chưa được xác nhận — số đang dùng lấy từ ảnh thiết
 * kế `11-Profile.png`.
 */
export const SUPPORT_HOTLINE =
  (Constants.expoConfig?.extra?.supportPhone as string | undefined) ?? "02363745745";

export function supportContact(dealer?: Dealer | null): SupportContact {
  const rep = dealer?.sales_rep;
  if (rep?.name && rep.phone) {
    return { label: `Gọi ${rep.name}`, name: rep.name, phone: rep.phone, isSalesRep: true };
  }
  return {
    label: "Gọi tổng đài BQ",
    name: "Tổng đài BQ",
    phone: SUPPORT_HOTLINE,
    isSalesRep: false,
  };
}

/** `tel:` đã bỏ khoảng trắng — nhiều máy không gọi được nếu còn dấu cách. */
export const telUrl = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

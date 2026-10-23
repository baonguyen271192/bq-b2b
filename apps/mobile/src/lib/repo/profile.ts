import type { Dealer } from "@bq/types";
import { loadJson, saveJson } from "../storage";

/**
 * Thông tin người đại diện mà đại lý TỰ sửa được (SPEC §5-N.7).
 *
 * TODO(api): chưa có endpoint cho đại lý tự sửa hồ sơ. `DealerPatch` trong
 * `@bq/types` là của web admin — cho app đại lý gọi nó nghĩa là đại lý tự sửa
 * được cả hạn mức và hạng của mình. Cần một endpoint riêng, giới hạn đúng các
 * trường ở đây.
 *
 * Số điện thoại KHÔNG nằm trong danh sách sửa được: đó là định danh đăng nhập
 * OTP, đổi nó là đổi tài khoản. Màn hình hiện nó ở dạng chỉ đọc kèm lối đi
 * (gọi tổng đài).
 */
export interface RepresentativeDraft {
  owner: string;
  email?: string;
}

export interface ProfileRepository {
  /** Bản sửa đang lưu trên máy, chồng lên dữ liệu từ API. */
  get(dealerCode: string): Promise<RepresentativeDraft | null>;
  save(dealerCode: string, draft: RepresentativeDraft): Promise<void>;
}

const key = (dealerCode: string) => `bq.profile.v1.${dealerCode}`;

export function createMockProfileRepository(): ProfileRepository {
  return {
    get: (dealerCode) => loadJson<RepresentativeDraft>(key(dealerCode)),
    save: (dealerCode, draft) => saveJson(key(dealerCode), draft),
  };
}

export const profileRepository = createMockProfileRepository();

/**
 * Hồ sơ hiển thị = dữ liệu API, chồng bản sửa cục bộ lên trên.
 *
 * Chồng chứ không thay: những trường đại lý không sửa được (hạn mức, hạng, mã)
 * vẫn phải là số của BQ.
 */
export function withLocalEdits(dealer: Dealer, draft: RepresentativeDraft | null): Dealer {
  if (!draft) return dealer;
  return {
    ...dealer,
    owner: draft.owner || dealer.owner,
    email: draft.email || dealer.email,
  };
}

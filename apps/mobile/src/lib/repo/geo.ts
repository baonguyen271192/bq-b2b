import type { SelectOption } from "@/components/ui";

/**
 * Đơn vị hành chính 2 cấp: Tỉnh/Thành phố → Phường/Xã (bỏ cấp huyện từ 2025).
 *
 * TODO(api): phải lấy từ nguồn CHÍNH THỨC qua `GET /api/geo/provinces` và
 * `/api/geo/provinces/{code}/wards` (xem `docs/sap-b1-mapping-proposal.md` A6).
 * Bảng dưới đây cố ý chỉ có vài mục để không ai nhầm là đủ dùng.
 */
export interface GeoRepository {
  provinces(): Promise<SelectOption[]>;
  wards(provinceCode: string): Promise<SelectOption[]>;
}

const PROVINCES: SelectOption[] = [
  { value: "48", label: "Đà Nẵng" },
  { value: "49", label: "Quảng Nam" },
  { value: "79", label: "TP. Hồ Chí Minh" },
  { value: "01", label: "Hà Nội" },
];

const WARDS: Record<string, SelectOption[]> = {
  "48": [
    { value: "20194", label: "Phường Thanh Khê" },
    { value: "20212", label: "Phường Hải Châu" },
    { value: "20233", label: "Phường Sơn Trà" },
  ],
  "49": [
    { value: "20350", label: "Phường Cẩm Châu" },
    { value: "20353", label: "Phường Hội An" },
  ],
  "79": [
    { value: "26734", label: "Phường Bến Nghé" },
    { value: "26737", label: "Phường Bến Thành" },
  ],
  "01": [
    { value: "00004", label: "Phường Hoàn Kiếm" },
    { value: "00008", label: "Phường Ba Đình" },
  ],
};

export const geoRepository: GeoRepository = {
  async provinces() { return PROVINCES; },
  async wards(provinceCode) { return WARDS[provinceCode] ?? []; },
};

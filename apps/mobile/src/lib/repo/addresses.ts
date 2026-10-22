import type { Address } from "@/components/ui";

/**
 * Sổ địa chỉ giao hàng của đại lý.
 *
 * Giao diện CHỈ gọi qua interface này, không đọc mock trực tiếp — khi có
 * `GET /api/dealers/{code}/addresses` (xem `docs/sap-b1-mapping-proposal.md` A6)
 * thì thay đúng một hàm `createAddressRepository`.
 */
export interface AddressRepository {
  list(dealerCode: string): Promise<Address[]>;
  add(dealerCode: string, draft: Omit<Address, "id">): Promise<Address>;
  update(dealerCode: string, address: Address): Promise<Address>;
  setDefault(dealerCode: string, id: string): Promise<Address[]>;
  remove(dealerCode: string, id: string): Promise<Address[]>;
}

/**
 * TODO(api): dữ liệu mock, khớp ảnh thiết kế `23-Addresses.png`.
 *
 * Sống trong bộ nhớ nên MẤT khi tắt app. Không dùng `AsyncStorage` vì đây là dữ
 * liệu của máy chủ chứ không phải thiết lập cục bộ — lưu xuống máy rồi tới lúc
 * nối API thật sẽ có hai nguồn sự thật đá nhau.
 */
const SEED: Address[] = [
  {
    id: "kho-minh-phat", label: "Kho Minh Phát – Thanh Khê",
    recipient: "Nguyễn Văn Phát", phone: "0912 345 468",
    street: "128 Hàm Nghi", ward: "Phường Thanh Khê", province: "Đà Nẵng",
    wardCode: "20194", provinceCode: "48",
    isDefault: true,
  },
  {
    id: "cua-hang-hai-chau", label: "Cửa hàng Hải Châu",
    recipient: "Lê Thị Mai", phone: "0935 118 204",
    street: "45 Lê Duẩn", ward: "Phường Hải Châu", province: "Đà Nẵng",
    wardCode: "20212", provinceCode: "48",
  },
  {
    id: "kho-hoi-an", label: "Kho Hội An",
    recipient: "Trần Văn Bình", phone: "0905 662 731",
    street: "210 Cửa Đại", ward: "Phường Cẩm Châu", province: "Quảng Nam",
    wardCode: "20350", provinceCode: "49",
  },
];

/** "Kho Hội An" -> "kho-hoi-an-1729..." — id tạm cho tới khi backend cấp. */
function slugId(label: string): string {
  const base = label
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "dia-chi"}-${Date.now().toString(36)}`;
}

export function createMockAddressRepository(): AddressRepository {
  const byDealer = new Map<string, Address[]>();
  const rows = (code: string) => {
    if (!byDealer.has(code)) byDealer.set(code, SEED.map((a) => ({ ...a })));
    return byDealer.get(code) as Address[];
  };

  return {
    async list(code) {
      return rows(code).map((a) => ({ ...a }));
    },
    async add(code, draft) {
      const list = rows(code);
      const created: Address = { ...draft, id: slugId(draft.label) };
      // Địa chỉ đầu tiên luôn là mặc định: giỏ hàng cần một địa chỉ để đặt được.
      if (list.length === 0) created.isDefault = true;
      if (created.isDefault) for (const a of list) a.isDefault = false;
      list.push(created);
      return { ...created };
    },
    async update(code, address) {
      const list = rows(code);
      const i = list.findIndex((a) => a.id === address.id);
      if (i >= 0) {
        if (address.isDefault) for (const a of list) a.isDefault = false;
        list[i] = { ...address };
      }
      return { ...address };
    },
    async setDefault(code, id) {
      const list = rows(code);
      for (const a of list) a.isDefault = a.id === id;
      return list.map((a) => ({ ...a }));
    },
    async remove(code, id) {
      const list = rows(code);
      const i = list.findIndex((a) => a.id === id);
      if (i >= 0) list.splice(i, 1);
      // Xoá mất địa chỉ mặc định thì cái đầu tiên lên thay, không để sổ không
      // có mặc định nào — giỏ hàng sẽ không biết chọn gì.
      if (list.length > 0 && !list.some((a) => a.isDefault)) list[0].isDefault = true;
      return list.map((a) => ({ ...a }));
    },
  };
}

export const addressRepository = createMockAddressRepository();

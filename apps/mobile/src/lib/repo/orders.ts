import { api } from "../api";
import { orderExtrasRepository } from "./order-extras";
import type { CartLine } from "../cart";
import type { Order } from "@bq/types";

/** Một dòng bị thiếu hàng khi gửi đơn (SPEC mục D-2). */
export interface StockShortage {
  code: string;
  name: string;
  size: string;
  /** Số đôi đại lý đặt. */
  wanted: number;
  /** Số đôi thực còn. */
  left: number;
}

export class StockChangedError extends Error {
  constructor(readonly shortages: StockShortage[]) {
    super("Tồn kho đã thay đổi");
    this.name = "StockChangedError";
  }
}

export interface SubmitOrderInput {
  dealerCode: string;
  lines: CartLine[];
  /** Mã địa chỉ giao hàng trong sổ của đại lý (quyết định H). */
  addressId: string;
  /** Khoá chống gửi trùng (mục D-1). */
  idempotencyKey: string;
  /**
   * Ghi chú cho BQ (SPEC §3.30), tối đa 254 ký tự theo trường `Comments` của
   * SAP B1.
   *
   * TODO(api): `POST /api/orders` chưa nhận trường này — xem A7 trong
   * `docs/sap-b1-mapping-proposal.md`. Hiện lưu qua `orderExtrasRepository` để
   * đơn vừa gửi vẫn hiện lại đúng ghi chú.
   */
  note?: string;
  channel?: string;
}

/**
 * Gửi đơn.
 *
 * Lớp đệm giữa giao diện và `api.createOrder`, vì hợp đồng API hiện tại CHƯA
 * khớp thứ v2 cần (xem `docs/sap-b1-mapping-proposal.md` A6):
 *
 *  - `address_id` và `Idempotency-Key`: backend chưa nhận. Tạm gửi địa chỉ qua
 *    trường `delivery` cũ để đơn không mất thông tin, và GIỮ khoá chống trùng ở
 *    phía client. Khi API nhận `address_id` thì sửa đúng hàm này.
 *  - `payment`: quyết định I bỏ bộ chọn theo từng đơn, nhưng DTO vẫn bắt buộc —
 *    không gửi thì backend mặc định "Công nợ". Để backend tự quyết.
 *
 * KHÔNG sửa API Java trong đợt giao diện này.
 */
/**
 * Kiểm tồn kho TRƯỚC khi gửi (SPEC mục 5.D-2).
 *
 * Bắt buộc, không phải cẩn thận thừa: backend LỌC IM LẶNG mọi size có
 * `qty > stock` ra khỏi đơn (`OrderService.create`, nhánh `qty <= stock`) rồi
 * vẫn tạo đơn thành công. Không kiểm trước thì đại lý đặt 6 đôi size 40, đơn
 * tạo xong không có size 40 nào, và không ai báo gì cả.
 */
export async function checkStock(
  dealerCode: string,
  lines: CartLine[],
): Promise<StockShortage[]> {
  const products = await api.products(dealerCode);
  const byCode = new Map(products.map((p) => [p.code, p]));
  const out: StockShortage[] = [];
  for (const line of lines) {
    const product = byCode.get(line.code);
    for (const [size, wanted] of Object.entries(line.sizes)) {
      if (wanted <= 0) continue;
      const left = product?.sizes[size] ?? 0;
      if (wanted > left) {
        out.push({ code: line.code, name: line.name, size, wanted, left });
      }
    }
  }
  return out;
}

/** Hạ số lượng về đúng tồn kho còn lại. */
export function trimToStock(lines: CartLine[], shortages: StockShortage[]): CartLine[] {
  const left = new Map(shortages.map((s) => [`${s.code}|${s.size}`, s.left]));
  return lines
    .map((l) => {
      const sizes: Record<string, number> = {};
      for (const [size, qty] of Object.entries(l.sizes)) {
        const cap = left.get(`${l.code}|${size}`);
        const next = cap === undefined ? qty : Math.min(qty, cap);
        if (next > 0) sizes[size] = next;
      }
      return { ...l, sizes };
    })
    .filter((l) => Object.keys(l.sizes).length > 0);
}

/** Bỏ hẳn những size đang thiếu, giữ nguyên các size còn lại. */
export function dropShortSizes(lines: CartLine[], shortages: StockShortage[]): CartLine[] {
  const drop = new Set(shortages.map((s) => `${s.code}|${s.size}`));
  return lines
    .map((l) => {
      const sizes = Object.fromEntries(
        Object.entries(l.sizes).filter(([size]) => !drop.has(`${l.code}|${size}`)),
      );
      return { ...l, sizes };
    })
    .filter((l) => Object.keys(l.sizes).length > 0);
}

export async function submitOrder(input: SubmitOrderInput): Promise<Order> {
  if (sent.has(input.idempotencyKey)) {
    const cached = sent.get(input.idempotencyKey);
    if (cached) return cached;
  }
  const order = await api.createOrder({
    dealer_code: input.dealerCode,
    lines: input.lines.map((l) => ({ code: l.code, sizes: l.sizes })),
    // TODO(api): đổi sang `address_id` khi backend nhận.
    delivery: input.addressId,
    channel: input.channel ?? "app",
  });
  if (input.note) await orderExtrasRepository.setNote(order.id, input.note);
  sent.set(input.idempotencyKey, order);
  return order;
}

/**
 * Nhớ các khoá đã gửi thành công trong phiên.
 *
 * Chống gửi trùng khi mạng chập chờn: bấm "Đặt hàng", mạng treo, người dùng bấm
 * lại — lần hai phải trả về CHÍNH đơn cũ chứ không tạo đơn thứ hai. Đây là lớp
 * phòng thủ phía client; lớp thật phải nằm ở backend qua `Idempotency-Key`.
 */
const sent = new Map<string, Order>();

/** Khoá chống trùng cho một lần bấm "Đặt hàng". */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

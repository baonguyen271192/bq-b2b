import { orderStep, parseOrderDate } from "@bq/core";
import type { Order } from "@bq/types";
import type { Address } from "@/components/ui";
import { loadJson, saveJson } from "../storage";
import { addressRepository } from "./addresses";

/**
 * Những gì màn Chi tiết đơn cần mà `GET /api/orders/{id}` CHƯA trả về.
 *
 * TODO(api) — sáu trường, đã liệt kê trong báo cáo rà soát 23/10:
 *  - `eta`          ngày dự kiến nhận
 *  - `carrier`      đơn vị vận chuyển
 *  - `trackingNo`   mã vận đơn
 *  - `stepTimes`    mốc giờ của từng bước (backend chỉ có `created_at` của đơn)
 *  - `addressId`    địa chỉ giao (app gửi lên theo A6 nhưng đơn trả về không có)
 *  - `note`         ghi chú cho BQ (SAP B1 có trường `Comments`)
 *  - `vatRate`/`vatAmount`
 *
 * Bản mock dưới đây suy ra TẤT CẢ từ `created_at` và `status` của đơn thật, nên
 * cùng một đơn luôn ra cùng một kết quả — ảnh chụp so sánh không nhảy số giữa
 * hai lần chạy. Khi API có thật, bỏ file này và đọc thẳng từ `Order`.
 */
export interface OrderExtras {
  eta: Date | null;
  carrier: string | null;
  trackingNo: string | null;
  /** Mốc giờ theo chỉ số bước của `ORDER_STEPS`. Thiếu thì để trống. */
  stepTimes: (Date | null)[];
  address: Address | null;
  note: string | null;
  /** Thuế suất phần trăm, vd 8. `null` khi backend chưa trả. */
  vatRate: number | null;
  vatAmount: number | null;
}

export interface OrderExtrasRepository {
  get(order: Order, dealerCode: string): Promise<OrderExtras>;
  /** Ghi ghi chú cho đơn. Mock giữ trong bộ nhớ. */
  setNote(orderId: string, note: string): Promise<void>;
}

/** Số ngày từ lúc đặt tới lúc dự kiến nhận, dùng cho mock. */
const LEAD_DAYS = 4;
/** Khoảng cách giữa các mốc trong dòng thời gian mock, tính bằng giờ. */
const STEP_HOURS = [0, 1.7, 24.3, 29.4, 96];

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3_600_000);
}

/**
 * Ghi chú lưu theo MÃ ĐƠN trên máy (SPEC §5-N.8).
 *
 * Trước đây giữ trong `Map` nên đại lý ghi "Giao buổi sáng", gửi đơn, mở lại app
 * thì ghi chú biến mất. Vẫn là bộ nhớ cục bộ, KHÔNG sang máy khác — việc đó chờ
 * `POST /api/orders` nhận trường ghi chú.
 */
const NOTES_KEY = "bq.order-notes.v1";
/** Bằng giới hạn trường `Comments` của SAP B1. */
const NOTE_MAX = 254;

type NoteMap = Record<string, string>;

export function createMockOrderExtrasRepository(): OrderExtrasRepository {
  /** Bộ nhớ đệm trong phiên để `get` không phải đọc ổ đĩa mỗi lần mở màn. */
  let cache: NoteMap | null = null;
  const notes = async (): Promise<NoteMap> => {
    if (!cache) cache = (await loadJson<NoteMap>(NOTES_KEY)) ?? {};
    return cache;
  };

  return {
    async get(order, dealerCode) {
      const placed = parseOrderDate(order.created_at);
      const step = orderStep(order.status);
      const addresses = await addressRepository.list(dealerCode).catch(() => [] as Address[]);
      const saved = await notes();

      // Chọn địa chỉ theo mã đơn chứ không lấy mặc định: đại lý ba kho thì mọi
      // đơn cùng về một kho trông sai rõ ràng hơn là sai lặng lẽ.
      const index = [...order.id].reduce((n, c) => n + c.charCodeAt(0), 0) % (addresses.length || 1);
      const address = addresses[index] ?? null;

      // Chỉ sinh mốc giờ cho những bước ĐÃ QUA. Bước chưa tới để trống — bịa giờ
      // cho một việc chưa xảy ra là thông tin sai, không phải khoảng trống thẩm mỹ.
      const stepTimes = STEP_HOURS.map((h, i) =>
        placed && step >= 0 && i <= step && !(i === step && step < 4) ? addHours(placed, h) : null);
      if (placed && step >= 0) stepTimes[0] = placed;

      const shipping = step >= 3;
      return {
        eta: placed && step >= 0 && step < 4 ? addHours(placed, LEAD_DAYS * 24) : null,
        carrier: shipping ? "BQ Express" : null,
        trackingNo: shipping ? `BQ-VN${order.id.replace(/\D/g, "")}${LEAD_DAYS}158` : null,
        stepTimes,
        address,
        note: saved[order.id] ?? null,
        // Backend chưa trả VAT (SPEC §5-C): để `null` và màn hình bỏ dòng VAT,
        // thay vì tự nhân 8% rồi hiện một con số app tự bịa.
        vatRate: null,
        vatAmount: null,
      };
    },
    async setNote(orderId, note) {
      const clean = note.trim().slice(0, NOTE_MAX);
      const map = { ...(await notes()) };
      if (clean) map[orderId] = clean;
      else delete map[orderId];
      cache = map;
      await saveJson(NOTES_KEY, map);
    },
  };
}

export const orderExtrasRepository = createMockOrderExtrasRepository();

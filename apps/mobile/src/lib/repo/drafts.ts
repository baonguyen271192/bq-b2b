import type { CartLine } from "../cart";

export interface Draft {
  id: string;
  /** "19/10/2026" — ngày lưu, cùng định dạng với `created_at` của đơn. */
  savedAt: string;
  lines: CartLine[];
  addressId?: string;
  subtotal: number;
  totalPairs: number;
}

/**
 * Đơn nháp (SPEC §3.21).
 *
 * TODO(api): chưa có `GET/POST /api/dealers/{code}/drafts`. Mock sống trong bộ
 * nhớ nên MẤT khi tắt app — trong khi màn Đơn nháp lại ghi "nháp lưu trên tài
 * khoản, mở được trên mọi thiết bị". Đó là lời hứa chỉ giữ được khi có API, đã
 * ghi vào báo cáo Phase 4.
 */
export interface DraftRepository {
  list(dealerCode: string): Promise<Draft[]>;
  save(dealerCode: string, draft: Omit<Draft, "id" | "savedAt">): Promise<Draft>;
  remove(dealerCode: string, id: string): Promise<Draft[]>;
}

function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function createMockDraftRepository(): DraftRepository {
  const byDealer = new Map<string, Draft[]>();
  const rows = (code: string) => {
    if (!byDealer.has(code)) byDealer.set(code, []);
    return byDealer.get(code) as Draft[];
  };
  let seq = 12;

  return {
    async list(code) { return rows(code).map((d) => ({ ...d })); },
    async save(code, draft) {
      seq += 1;
      const created: Draft = { ...draft, id: `NH-${String(seq).padStart(4, "0")}`, savedAt: today() };
      rows(code).unshift(created);
      return { ...created };
    },
    async remove(code, id) {
      const list = rows(code);
      const i = list.findIndex((d) => d.id === id);
      if (i >= 0) list.splice(i, 1);
      return list.map((d) => ({ ...d }));
    },
  };
}

export const draftRepository = createMockDraftRepository();

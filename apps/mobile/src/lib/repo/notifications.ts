import { dayMonth, dueDateOf, daysUntil, orderIsOpen, orderStep, vnd } from "@bq/core";
import type { CreditDetail, Order } from "@bq/types";
import { api } from "../api";
import { paymentDeclarations, type PaymentDeclaration } from "./payments";

export type NotificationKind =
  | "shipping" | "pending" | "due" | "paid" | "invoice" | "rejected";
export type NotificationGroup = "order" | "debt" | "invoice";

export interface Notification {
  id: string;
  kind: NotificationKind;
  group: NotificationGroup;
  title: string;
  body: string;
  /** Mốc để nhóm "Hôm nay" / "Trước đó" và để sắp xếp. */
  at: Date;
  /** Điều hướng khi chạm. */
  href?: string;
  read?: boolean;
}

/**
 * Thông báo (SPEC §3.20).
 *
 * KHÔNG có API thông báo. Thay vì bịa danh sách, suy ra từ dữ liệu THẬT đang có:
 * trạng thái đơn (`GET /api/orders`) và công nợ (`GET /api/dealers/{code}/credit`).
 * Mọi dòng dưới đây đều truy được về một đơn hoặc một hoá đơn có thật.
 *
 * Hai thứ cách làm này KHÔNG làm được, và phải có API đẩy mới làm được:
 *  - biết đúng THỜI ĐIỂM trạng thái đổi (hiện chỉ có `created_at` của đơn);
 *  - nhớ đã đọc hay chưa (hiện giữ trong phiên, mất khi tắt app).
 */
export interface NotificationRepository {
  list(dealerCode: string): Promise<Notification[]>;
  markRead(id: string): void;
  markAllRead(ids: string[]): void;
}

/** Hoá đơn sắp đến hạn trong ngần này thì mới báo. */
const DUE_SOON_DAYS = 15;

function fromOrders(orders: Order[]): Notification[] {
  const out: Notification[] = [];
  for (const o of orders) {
    const at = parseVnDate(o.created_at) ?? new Date();

    /*
     * Đơn bị TỪ CHỐI / HUỶ phải báo trước mọi thứ khác.
     *
     * Bản cũ lọc `!orderIsOpen(o.status)` ngay đầu vòng, mà `orderStep` trả -1
     * cho đơn bị từ chối nên nó rơi luôn khỏi danh sách: đại lý có một đơn 98,7
     * triệu bị từ chối mà hộp thông báo không có một dòng nào. Đây chính là sự
     * kiện đại lý cần biết nhất.
     */
    if (orderStep(o.status) < 0) {
      const rejected = o.status.toLowerCase().includes("từ chối");
      out.push({
        id: `order-rejected-${o.id}`, kind: "rejected", group: "order",
        title: rejected ? `Đơn ${o.id} bị từ chối` : `Đơn ${o.id} đã huỷ`,
        body: o.approve_note
          ? `Lý do: ${o.approve_note}`
          : `${vnd(o.subtotal)} · Đơn không ghi nợ. Xem chi tiết hoặc gửi lại.`,
        at, href: `/order/${o.id}`,
      });
      continue;
    }

    if (!orderIsOpen(o.status)) continue;
    if (o.over_limit && o.status.toLowerCase().includes("chờ")) {
      out.push({
        id: `order-pending-${o.id}`, kind: "pending", group: "order",
        title: `Đơn ${o.id} chờ duyệt`,
        body: "Đơn vượt hạn mức khả dụng, đang chờ Sale duyệt.",
        at, href: `/order/${o.id}`,
      });
      continue;
    }
    out.push({
      id: `order-${o.id}-${o.status}`, kind: "shipping", group: "order",
      title: `Đơn ${o.id} ${o.status.toLowerCase()}`,
      body: `${o.items.length} mẫu, ${o.items.reduce((s, i) => s + i.qty_total, 0)} đôi · ${vnd(o.subtotal)}`,
      at, href: `/order/${o.id}`,
    });
  }
  return out;
}

function fromCredit(detail: CreditDetail): Notification[] {
  const out: Notification[] = [];
  for (const inv of detail.invoices) {
    if (inv.paid) continue;
    const due = dueDateOf(inv.created_at, inv.payment);
    if (!due) continue;
    const left = daysUntil(due);
    if (left > DUE_SOON_DAYS) continue;
    out.push({
      id: `due-${inv.id}`, kind: "due", group: "debt",
      title: left < 0 ? "Hoá đơn đã quá hạn" : "Sắp đến hạn thanh toán",
      body: `${inv.id}, ${vnd(inv.subtotal)}, đến hạn ${dayMonth(due)}.`,
      at: due, href: "/(tabs)/debt",
    });
  }
  for (const t of detail.transactions.slice(0, 3)) {
    out.push({
      id: `paid-${t.id}`, kind: "paid", group: "debt",
      title: "Đã ghi nhận thanh toán",
      body: `BQ đã nhận ${vnd(Math.abs(t.amount))}. Hạn mức đã được cập nhật.`,
      at: parseVnDate(t.created_at) ?? new Date(), href: "/(tabs)/debt",
    });
  }
  return out;
}

/** "18/10/2026 08:30" hoặc "18/10/2026" -> Date. */
/**
 * Thông báo cho mỗi lần đại lý tự báo đã chuyển khoản (SPEC §5-N.4).
 *
 * Suy từ chính bản ghi đại lý vừa tạo, nên không phải tin tức từ BQ — nhưng đó
 * là cách duy nhất để việc "tôi đã báo rồi" có dấu vết nhìn thấy được khi chưa
 * có endpoint đối soát.
 */
function fromDeclarations(rows: readonly PaymentDeclaration[]): Notification[] {
  return rows.map((d) => ({
    id: `declared-${d.declaredAt}`,
    kind: "paid" as const,
    group: "debt" as const,
    title: "Đã gửi báo chuyển khoản",
    body: d.kind === "invoice"
      ? `${vnd(d.amount)} cho ${d.invoiceId}. Hạn mức cập nhật khi BQ ghi nhận.`
      : `${vnd(d.amount)}, nội dung "${d.content}". Hạn mức cập nhật khi BQ ghi nhận.`,
    at: new Date(d.declaredAt),
    href: "/(tabs)/debt",
  }));
}

function parseVnDate(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0));
}

export function createNotificationRepository(): NotificationRepository {
  /** TODO(api): trạng thái đã đọc giữ trong phiên, mất khi tắt app. */
  const read = new Set<string>();

  return {
    async list(dealerCode) {
      const [o, c, d] = await Promise.allSettled([
        api.orders(dealerCode),
        api.credit(dealerCode),
        paymentDeclarations.list(dealerCode),
      ]);
      const rows = [
        ...(o.status === "fulfilled" ? fromOrders(o.value) : []),
        ...(c.status === "fulfilled" ? fromCredit(c.value) : []),
        ...(d.status === "fulfilled" ? fromDeclarations(d.value) : []),
      ];
      return rows
        .map((n) => ({ ...n, read: read.has(n.id) }))
        .sort((a, b) => b.at.getTime() - a.at.getTime());
    },
    markRead(id) { read.add(id); },
    markAllRead(ids) { for (const id of ids) read.add(id); },
  };
}

export const notificationRepository = createNotificationRepository();

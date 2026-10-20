"use client";
import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck, CheckCircle2, Package, Truck, AlertTriangle, XCircle, CreditCard, Gift } from "lucide-react";
import { api, Order, CreditDetail } from "@/lib/api";
import { useStore } from "@/lib/store";

// rk = "read key": đổi khi nội dung thông báo đổi (vd đơn đổi trạng thái) → tự thành "chưa đọc" lại.
export type Noti = { id: string; rk: string; Icon: typeof Gift; color: string; bg: string; title: string; body: string; time: string; href?: string };

const READ_KEY = "bq_read_notis";
const EVT = "bq-noti-read";

function getReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); }
}
export function markRead(keys: string[]) {
  const s = getReadSet();
  keys.forEach((k) => s.add(k));
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
  window.dispatchEvent(new Event(EVT));
}

// Sinh thông báo THẬT từ trạng thái đơn hàng của đại lý.
function fromOrder(o: Order): Noti | null {
  const base = { id: o.id, rk: `${o.id}|${o.status}`, time: o.created_at, href: `/orders/${o.id}` };
  const amount = o.subtotal.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
  if (o.status.includes("đã nhận"))
    return { ...base, Icon: CheckCircle2, color: "var(--bq-green)", bg: "var(--bq-green-soft)", title: "Giao hàng thành công", body: `Đơn ${o.id} (${amount}) đã bàn giao đầy đủ cho đại lý.` };
  if (o.status.includes("bàn giao"))
    return { ...base, Icon: Truck, color: "#3b82f6", bg: "#dbeafe", title: "Đơn đang giao", body: `Đơn ${o.id} đang trên đường vận chuyển tới kho của bạn.` };
  if (o.status.includes("đóng gói"))
    return { ...base, Icon: Package, color: "#3b82f6", bg: "#dbeafe", title: "Đang đóng gói", body: `Đơn ${o.id} đang được chuẩn bị & đóng gói tại kho sỉ BQ.` };
  if (o.status.includes("Đã xác nhận"))
    return { ...base, Icon: CheckCircle2, color: "var(--bq-green)", bg: "var(--bq-green-soft)", title: "Đơn đã được xác nhận", body: `BQ đã xác nhận đơn ${o.id} (${amount}). Đang xử lý.` };
  if (o.status.includes("duyệt"))
    return { ...base, Icon: AlertTriangle, color: "var(--bq-amber)", bg: "var(--bq-amber-soft)", title: "Đơn chờ duyệt", body: `Đơn ${o.id} vượt hạn mức công nợ, đang chờ quản lý BQ duyệt.` };
  if (o.status.includes("Chờ xác nhận"))
    return { ...base, Icon: ClipboardCheck, color: "var(--bq-orange)", bg: "var(--bq-orange-soft)", title: "Đã gửi đơn sỉ", body: `Đơn ${o.id} (${amount}) đã gửi, đang chờ BQ xác nhận.` };
  if (o.status.includes("huỷ") || o.status.includes("từ chối")) {
    const st = o.status.toLowerCase(); // "đã huỷ" / "đã từ chối"
    return { ...base, Icon: XCircle, color: "var(--bq-red)", bg: "#fde8e8", title: `Đơn ${st}`, body: `Đơn ${o.id} ${st}. Hạn mức công nợ đã được hoàn lại.` };
  }
  return null;
}

export function buildNotifications(orders: Order[], credit: CreditDetail | null): Noti[] {
  const list: Noti[] = orders.map(fromOrder).filter((x): x is Noti => x !== null);
  const unpaid = credit?.invoices.filter((i) => !i.paid) ?? [];
  if (unpaid.length > 0) {
    const total = unpaid.reduce((s, i) => s + i.subtotal, 0).toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
    list.unshift({ id: "pay-reminder", rk: `pay|${unpaid.length}|${total}`, Icon: CreditCard, color: "var(--bq-amber)", bg: "var(--bq-amber-soft)",
      title: "Nhắc thanh toán công nợ", body: `Bạn đang có ${unpaid.length} hoá đơn chưa thanh toán, tổng ${total}.`, time: "Hôm nay", href: "/account" });
  }
  list.push({ id: "promo", rk: "promo|thu-dong-2026", Icon: Gift, color: "var(--bq-orange)", bg: "var(--bq-orange-soft)",
    title: "BST Thu Đông 2026", body: "Chiết khấu 15% cho đơn từ 200 đôi. Áp dụng đến hết tháng.", time: "Ưu đãi" });
  return list;
}

// Hook dùng chung: danh sách thông báo + trạng thái đã/chưa đọc + số chưa đọc.
export function useNotifications() {
  const { dealer } = useStore();
  const [notis, setNotis] = useState<Noti[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = () => Promise.all([api.orders(dealer), api.credit(dealer).catch(() => null as CreditDetail | null)])
      .then(([orders, credit]) => setNotis(buildNotifications(orders, credit))).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [dealer]);

  useEffect(() => {
    const sync = () => setRead(getReadSet());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const isRead = useCallback((rk: string) => read.has(rk), [read]);
  const unreadCount = notis.filter((n) => !read.has(n.rk)).length;
  const markAllRead = useCallback(() => markRead(notis.map((n) => n.rk)), [notis]);

  return { notis, isRead, unreadCount, markAllRead };
}

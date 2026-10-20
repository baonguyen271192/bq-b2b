"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CreditCard, PlusCircle, Gift, PackageOpen, ShoppingCart } from "lucide-react";
import { api, Dealer, Order, CreditDetail, vnd } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";
import { useStore } from "@/lib/store";
import EmptyState from "@/components/EmptyState";

// Badge trạng thái theo đúng token Figma
const badge = (s: string) => {
  if (s.includes("từ chối") || s.includes("huỷ")) return { bg: "#fde8e8", fg: "var(--bq-red)" };
  if (s.includes("xác nhận") || s.includes("duyệt") || s.includes("đóng gói") || s.includes("bàn giao"))
    return { bg: "var(--bq-amber-soft)", fg: "var(--bq-amber)" };
  return { bg: "var(--bq-green-soft)", fg: "var(--bq-green)" }; // đã nhận / mặc định
};

export default function Home() {
  const { dealer, cartCount } = useStore();
  const [d, setD] = useState<Dealer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [credit, setCredit] = useState<CreditDetail | null>(null);

  useEffect(() => {
    api.dealer(dealer).then(setD).catch(() => {});
    api.orders(dealer).then(setOrders).catch(() => {});
    api.credit(dealer).then(setCredit).catch(() => {});
  }, [dealer]);

  const { unreadCount: notiCount } = useNotifications();

  const h = new Date().getHours();
  const greeting = h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";


  // Hạn thanh toán gần nhất = ngày đặt + 30 ngày, của hoá đơn công nợ chưa trả sớm nhất.
  const nearestDue = (() => {
    const unpaid = (credit?.invoices || []).filter((iv) => !iv.paid);
    if (unpaid.length === 0) return null;
    const parse = (s: string) => {
      const [dd, mm, yy] = s.split(" ")[0].split("/").map(Number);
      return new Date(yy, (mm || 1) - 1, dd || 1);
    };
    const dues = unpaid.map((iv) => { const t = parse(iv.created_at); t.setDate(t.getDate() + 30); return t; });
    const soonest = new Date(Math.min(...dues.map((x) => x.getTime())));
    const days = Math.ceil((soonest.getTime() - Date.now()) / 86400000);
    const label = `${String(soonest.getDate()).padStart(2, "0")}/${String(soonest.getMonth() + 1).padStart(2, "0")}/${soonest.getFullYear()}`;
    return { label, days };
  })();

  return (
    <div>
      {/* app-header: 56px, BQ WHOLESALE Outfit Bold 18 #e8541e + bell */}
      <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bq-line)",
        position: "sticky", top: 0, zIndex: 30 }}>
        <div className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>BQ WHOLESALE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link href="/cart" style={{ position: "relative", textDecoration: "none", color: "var(--bq-ink)" }}>
            <ShoppingCart size={23} strokeWidth={2} />
            {cartCount > 0 && (
              <span style={{ position: "absolute", top: -5, right: -8, background: "var(--bq-orange)", color: "#fff",
                borderRadius: 10, fontSize: 9, minWidth: 15, height: 15, display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontFamily: "var(--font-geist)", padding: "0 3px" }}>{cartCount}</span>
            )}
          </Link>
          <Link href="/notifications" style={{ position: "relative", textDecoration: "none", color: "var(--bq-ink)" }}>
            <Bell size={23} strokeWidth={2} />
            {notiCount > 0 && (
              <span style={{ position: "absolute", top: -5, right: -8, background: "var(--bq-orange)", color: "#fff",
                borderRadius: 10, fontSize: 9, minWidth: 15, height: 15, display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontFamily: "var(--font-geist)", padding: "0 3px" }}>{notiCount > 99 ? "99+" : notiCount}</span>
            )}
          </Link>
        </div>
      </div>

      {/* scroll-content: V gap 20, pad 16 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "16px 16px 96px" }}>
        {/* greeting-block: V gap 4 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="font-head" style={{ fontSize: 20, fontWeight: 700, color: "var(--bq-ink)" }}>
            {greeting}, {d?.name?.replace(/^(Đại lý|Cửa hàng|NPP)\s*/, "") || "Đại lý"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{d?.code}</span>
            <span style={{ width: 1, height: 12, background: "var(--bq-line)" }} />
            <span style={{ background: "var(--bq-gold)", color: "#fff", fontSize: 10, fontWeight: 700,
              padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-geist)" }}>Tier {d?.tier}</span>
          </div>
        </div>

        {/* summary-card: V gap 16, pad 16, radius 12 */}
        {d && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} strokeWidth={2} color="var(--bq-orange)" />
              <span className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 14 }}>HẠN MỨC &amp; CÔNG NỢ</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Metric label="Hạn mức công nợ:" value={vnd(d.credit_limit)} />
              <Metric label="Công nợ hiện tại:" value={vnd(d.credit_used)} valueColor="var(--bq-red)" />
              <div style={{ height: 1, background: "var(--bq-line)" }} />
              <Metric label="Công nợ khả dụng:" labelColor="var(--bq-orange)" labelWeight={600}
                value={vnd(d.credit_available)} valueColor="var(--bq-green)" valueSize={15} valueWeight={800} />
              <Metric label="Hạn thanh toán gần nhất:"
                value={nearestDue ? `${nearestDue.label}${nearestDue.days >= 0 ? ` (còn ${nearestDue.days} ngày)` : " (quá hạn)"}` : "Không có"}
                valueColor={nearestDue && nearestDue.days < 0 ? "var(--bq-red)" : "var(--bq-ink)"} />
            </div>
          </div>
        )}

        {/* quick-actions: H gap 8, mỗi thẻ pad 12 radius 8 */}
        <Link href="/products" className="font-head" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          height: 46, borderRadius: 10, background: "var(--bq-orange)", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          <PlusCircle size={18} /> Tạo đơn hàng mới
        </Link>

        {/* recent-orders: V gap 12 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-head" style={{ fontWeight: 700, fontSize: 15 }}>ĐƠN HÀNG GẦN ĐÂY</span>
            <Link href="/orders" style={{ color: "var(--bq-orange)", fontSize: 12, textDecoration: "none", fontWeight: 600, fontFamily: "var(--font-geist)" }}>Xem tất cả</Link>
          </div>
          {orders.slice(0, 3).map((o) => {
            const b = badge(o.status);
            return (
              <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "var(--font-geist)" }}>{o.id}</span>
                    <span style={{ color: "var(--bq-orange)", fontWeight: 800, fontSize: 14, fontFamily: "var(--font-geist)" }}>{vnd(o.subtotal)}</span>
                  </div>
                  <span style={{ background: b.bg, color: b.fg, fontSize: 11, fontWeight: 700, padding: "4px 8px",
                    borderRadius: 4, fontFamily: "var(--font-geist)" }}>{o.status.replace(" (vượt hạn mức)", "")}</span>
                </div>
              </Link>
            );
          })}
          {orders.length === 0 && (
            <div className="card">
              <EmptyState Icon={PackageOpen} title="Chưa có đơn nào" compact
                subtitle="Đơn sỉ bạn đặt sẽ hiện ở đây." />
            </div>
          )}
        </div>

        {/* promo-banner: tông nhạt để không trùng/tranh với CTA cam đặc */}
        <div style={{ background: "var(--bq-orange-soft)", border: "1px solid #f7d3c2", borderRadius: 10, padding: 12,
          display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bq-orange)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gift size={18} strokeWidth={2} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, color: "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>
            Bộ sưu tập Thu Đông 2026 — <span style={{ color: "var(--bq-orange)", fontWeight: 700 }}>Chiết khấu 15%</span> cho đơn từ 200 đôi
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, labelColor, labelWeight, valueColor, valueSize, valueWeight }:
  { label: string; value: string; labelColor?: string; labelWeight?: number; valueColor?: string; valueSize?: number; valueWeight?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: labelColor || "var(--bq-muted)", fontWeight: labelWeight || 400, fontFamily: "var(--font-geist)" }}>{label}</span>
      <span style={{ fontSize: valueSize || 14, fontWeight: valueWeight || 700, color: valueColor || "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{value}</span>
    </div>
  );
}


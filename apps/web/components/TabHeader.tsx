"use client";
import Link from "next/link";
import { Bell, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import { useNotifications } from "@/lib/notifications";

// Header cho các tab chính: tiêu đề cam + giỏ hàng (đơn nháp) + chuông thông báo.
export default function TabHeader({ title }: { title: string }) {
  const { cartCount } = useStore();
  const { unreadCount: notiCount } = useNotifications();
  return (
    <div style={{ background: "#fff", padding: "16px", borderBottom: "1px solid var(--bq-line)",
      position: "sticky", top: 0, zIndex: 30, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 19 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Link href="/cart" style={{ position: "relative", textDecoration: "none", color: "var(--bq-ink)" }}>
          <ShoppingCart size={22} strokeWidth={2} />
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -8, background: "var(--bq-orange)", color: "#fff",
              borderRadius: 10, fontSize: 9, minWidth: 15, height: 15, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, fontFamily: "var(--font-geist)", padding: "0 3px" }}>{cartCount}</span>
          )}
        </Link>
        <Link href="/notifications" style={{ position: "relative", textDecoration: "none", color: "var(--bq-ink)" }}>
          <Bell size={22} strokeWidth={2} />
          {notiCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -8, background: "var(--bq-orange)", color: "#fff",
              borderRadius: 10, fontSize: 9, minWidth: 15, height: 15, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, fontFamily: "var(--font-geist)", padding: "0 3px" }}>{notiCount > 99 ? "99+" : notiCount}</span>
          )}
        </Link>
      </div>
    </div>
  );
}

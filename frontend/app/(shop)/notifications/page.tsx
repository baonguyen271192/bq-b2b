"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useNotifications, markRead } from "@/lib/notifications";

export default function NotificationsPage() {
  const { notis, isRead, unreadCount, markAllRead } = useNotifications();
  const router = useRouter();

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 30,
        borderBottom: "1px solid var(--bq-line)", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.back()} aria-label="Quay lại"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bq-orange)", display: "flex", padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <div className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 800, fontSize: 19 }}>Thông báo</div>
        </div>
        {unreadCount > 0
          ? <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer",
              color: "var(--bq-orange)", fontSize: 13, fontWeight: 700 }}>Đánh dấu đã đọc</button>
          : <span style={{ color: "#a3acbb", fontSize: 13, fontWeight: 600 }}>Đã đọc tất cả</span>}
      </div>
      <div style={{ paddingBottom: 96 }}>
        {notis.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "var(--bq-muted)", fontSize: 14 }}>Chưa có thông báo.</div>}
        {notis.map((n) => {
          const unread = !isRead(n.rk);
          const Row = (
            <div onClick={() => unread && markRead([n.rk])}
              style={{ display: "flex", gap: 12, padding: "16px", borderBottom: "1px solid var(--bq-line)",
                background: unread ? "#fff7f3" : "#fff", position: "relative" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: n.bg, color: n.color, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <n.Icon size={20} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ fontWeight: unread ? 700 : 600, fontSize: 14, color: unread ? "var(--bq-ink)" : "#475569" }}>{n.title}</div>
                  {unread && <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--bq-orange)", flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 13, color: "var(--bq-muted)", lineHeight: 1.5, margin: "3px 0 4px" }}>{n.body}</div>
                <div style={{ fontSize: 12, color: "#a3acbb" }}>{n.time}</div>
              </div>
            </div>
          );
          return n.href
            ? <Link key={n.id} href={n.href} onClick={() => markRead([n.rk])} style={{ textDecoration: "none", color: "inherit" }}>{Row}</Link>
            : <div key={n.id}>{Row}</div>;
        })}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, Package, Store, Wallet, Smartphone, LucideIcon } from "lucide-react";
import SaleAssistant from "@/components/SaleAssistant";

const NAV: { href: string; Icon: LucideIcon; label: string }[] = [
  { href: "/admin", Icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/admin/orders", Icon: ReceiptText, label: "Đơn hàng" },
  { href: "/admin/products", Icon: Package, label: "Sản phẩm & Tồn kho" },
  { href: "/admin/dealers", Icon: Store, label: "Đại lý" },
  { href: "/admin/credit", Icon: Wallet, label: "Công nợ" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{
        width: 232, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--bq-line)",
        position: "sticky", top: 0, height: "100vh", padding: "18px 14px",
        display: "flex", flexDirection: "column", gap: 4,
      }} className="admin-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 16px" }}>
          <div style={{ background: "var(--bq-orange)", color: "#fff", fontWeight: 800,
            borderRadius: 8, padding: "5px 10px", fontSize: 15 }}>BQ</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>BQ Admin</div>
            <div style={{ fontSize: 11, color: "var(--bq-muted)" }}>B2B đại lý</div>
          </div>
        </div>

        {NAV.map((n) => {
          const active = isActive(n.href);
          const { Icon } = n;
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
              borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: active ? 700 : 500,
              color: active ? "var(--bq-orange)" : "var(--bq-ink)",
              background: active ? "var(--bq-orange-soft)" : "transparent",
            }}>
              <Icon size={18} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
              <span>{n.label}</span>
            </Link>
          );
        })}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px 12px", borderRadius: 10, textDecoration: "none", fontSize: 13.5, fontWeight: 700,
            color: "var(--bq-orange)", background: "var(--bq-orange-soft)", border: "1px solid #f3c6b4",
          }}>
            <Smartphone size={17} strokeWidth={2} /> Demo App Đại lý
          </Link>
          <div style={{ fontSize: 11, color: "var(--bq-muted)", padding: "0 8px" }}>Demo · dữ liệu mẫu</div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, padding: "24px 28px", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        {children}
      </main>

      <SaleAssistant />
    </div>
  );
}

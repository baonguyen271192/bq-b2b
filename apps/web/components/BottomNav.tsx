"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ClipboardList, CreditCard, User } from "lucide-react";

const items = [
  { href: "/", label: "Trang chủ", Icon: Home },
  { href: "/products", label: "Đặt hàng", Icon: ShoppingBag },
  { href: "/orders", label: "Đơn hàng", Icon: ClipboardList },
  { href: "/account", label: "Công nợ", Icon: CreditCard },
  { href: "/profile", label: "Tài khoản", Icon: User },
];

// Các trang chi tiết có thanh CTA riêng -> ẩn bottom nav để không chồng 2 thanh.
const HIDE_ON = ["/product/", "/cart", "/checkout", "/review", "/order-success", "/addresses"];

export default function BottomNav() {
  const path = usePathname();
  const isDetail = HIDE_ON.some((p) => path.startsWith(p)) || /^\/orders\/[^/]+$/.test(path);
  if (isDetail) return null;
  return (
    <nav
      style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid var(--bq-line)",
        display: "flex", padding: "8px 0 12px", zIndex: 50,
      }}
    >
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        const color = active ? "var(--bq-orange)" : "var(--bq-muted)";
        return (
          <Link key={href} href={href}
            style={{ flex: 1, textDecoration: "none", textAlign: "center", color, fontSize: 10, fontWeight: 600,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", whiteSpace: "nowrap" }}>
            <Icon size={22} strokeWidth={active ? 2.2 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

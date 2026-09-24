"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";
import { api, Dealer } from "@/lib/api";
import { useStore } from "@/lib/store";
import TabHeader from "@/components/TabHeader";

export default function ProfilePage() {
  const { dealer } = useStore();
  const [d, setD] = useState<Dealer | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  useEffect(() => { api.dealer(dealer).then(setD).catch(() => {}); }, [dealer]);

  const shortName = d?.name?.replace(/^(Đại lý|Cửa hàng|NPP)\s*/, "") || "";
  const initials = shortName.split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "BQ";

  const logout = () => {
    try { localStorage.clear(); } catch {}
    window.location.href = "/";
  };

  // href rỗng = mục thông tin, mở bằng gọi/hotline; các mục có route thì điều hướng.
  const menu = [
    { label: "Địa chỉ giao hàng sỉ (3)", href: "/addresses" },
    { label: "Hạn mức tín dụng & công nợ đại lý", href: "/account" },
    { label: "Cài đặt thông báo & bảo mật", href: "/notifications" },
    { label: "Trợ giúp & Hỗ trợ đại lý BQ", tel: "19006024" },
  ];

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TabHeader title="Tài khoản" />

      <div style={{ padding: "16px 16px 96px", display: "grid", gap: 14 }}>
        {/* Profile card ngang — đăng xuất ở góc phải */}
        <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bq-bg)", color: "var(--bq-muted)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, flexShrink: 0,
            fontFamily: "var(--font-geist)" }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="font-head" style={{ fontWeight: 800, fontSize: 17 }}>{d?.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{d?.code}</span>
              <span style={{ width: 1, height: 12, background: "var(--bq-line)" }} />
              <span style={{ background: "var(--bq-gold)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{d?.tier?.toUpperCase()}</span>
            </div>
          </div>
          <button title="Đăng xuất" onClick={() => setConfirmOut(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bq-red)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
            <LogOut size={22} strokeWidth={2} />
          </button>
        </div>

        {/* Thông tin liên hệ đại diện — dữ liệu BE theo từng đại lý */}
        <div className="card" style={{ padding: 16 }}>
          <div className="font-head" style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)", marginBottom: 12 }}>THÔNG TIN LIÊN HỆ ĐẠI DIỆN</div>
          <Info label="Chủ đại lý:" value={d?.owner || "—"} />
          <Info label="Số điện thoại:" value={d?.phone || "—"} />
          <Info label="Email đại lý:" value={d?.email || "—"} />
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: "var(--bq-muted)" }}>Địa chỉ xuất hoá đơn:</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{d?.invoice_address || "—"}</div>
          </div>
        </div>

        {/* Menu chữ */}
        <div className="card" style={{ overflow: "hidden" }}>
          {menu.map(({ label, href, tel }, i) => {
            const inner = (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 16px",
                fontSize: 14, borderBottom: i < menu.length - 1 ? "1px solid var(--bq-line)" : "none" }}>
                <span>{label}</span>
                <span style={{ color: "var(--bq-muted)" }}>›</span>
              </div>
            );
            if (href) return <Link key={label} href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
            return <a key={label} href={`tel:${tel}`} style={{ textDecoration: "none", color: "inherit" }}>{inner}</a>;
          })}
        </div>

        {/* Nút demo: sang màn Admin (Sale & Quản lý) */}
        <Link href="/admin" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15,
          color: "var(--bq-orange)", background: "#fff", border: "1.5px solid var(--bq-orange)",
        }}>
          <LayoutDashboard size={19} strokeWidth={2} /> Demo Admin (Sale &amp; Quản lý)
        </Link>
      </div>

      {/* Modal xác nhận đăng xuất */}
      {confirmOut && (
        <div onClick={() => setConfirmOut(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div className="font-head" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Đăng xuất?</div>
            <div style={{ fontSize: 13, color: "var(--bq-muted)", marginBottom: 18 }}>Bạn sẽ cần đăng nhập lại để tiếp tục đặt hàng sỉ.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setConfirmOut(false)}>Ở lại</button>
              <button onClick={logout} className="font-head"
                style={{ flex: 1, height: 46, borderRadius: 12, border: "none", background: "var(--bq-red)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 14,
      borderBottom: last ? "none" : "1px solid var(--bq-line)" }}>
      <span style={{ color: "var(--bq-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

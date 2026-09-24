"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Dealer } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function Header({ title, back }: { title?: string; back?: boolean }) {
  const { dealer, cartCount } = useStore();
  const [current, setCurrent] = useState<Dealer | null>(null);

  useEffect(() => { api.dealer(dealer).then(setCurrent).catch(() => {}); }, [dealer]);

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff",
      borderBottom: "1px solid var(--bq-line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        {back ? (
          <Link href="/" style={{ fontSize: 22, textDecoration: "none", color: "var(--bq-ink)" }}>‹</Link>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "var(--bq-orange)", color: "#fff", fontWeight: 800,
              borderRadius: 8, padding: "3px 7px", fontSize: 15 }}>BQ</div>
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>
          {title || "Giày BQ Shop"}
        </div>
        <Link href="/cart" style={{ position: "relative", fontSize: 22, textDecoration: "none" }}>
          🛒
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -8, background: "var(--bq-orange)",
              color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 5px", fontWeight: 700 }}>
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Thanh chọn đại lý (demo — thực tế là tài khoản đăng nhập) */}
      <div style={{ padding: "0 16px 10px" }}>
        <div style={{ background: "var(--bq-orange-soft)", borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
          👤 <b>{current?.name || dealer}</b> · Hạng {current?.tier} · KD:{" "}
          {current ? current.credit_available.toLocaleString("vi-VN") + "đ" : "…"}
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { Product, vnd } from "@/lib/api";

const TIER_PCT: Record<string, number> = { "Đồng": 0, "Bạc": 3, "Vàng": 5, "Kim Cương": 8 };

export default function ProductCard({ p, tier }: { p: Product; tier?: string }) {
  const stock = Object.values(p.sizes).reduce((a, b) => a + b, 0);
  const pct = tier ? TIER_PCT[tier] ?? 0 : 0;
  return (
    <Link href={`/product/${p.code}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid var(--bq-line)" }}>
        <div style={{ width: "100%", height: 140, background: "#eef1f5", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {pct > 0 && (
            <span style={{ position: "absolute", top: 8, right: 8, background: "var(--bq-amber-soft)", color: "var(--bq-amber)",
              fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>Giảm {pct}% sỉ</span>
          )}
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{p.code}</div>
          <div className="font-head" style={{ fontWeight: 700, fontSize: 14, margin: "3px 0 5px", lineHeight: 1.3,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 36 }}>{p.name}</div>
          <div style={{ color: "var(--bq-orange)", fontWeight: 800, fontSize: 16, fontFamily: "var(--font-geist)" }}>{vnd(p.price)}</div>
          <div style={{ fontSize: 12, color: "var(--bq-green)", fontFamily: "var(--font-geist)", marginTop: 3 }}>Tồn kho: {stock} đôi</div>
        </div>
      </div>
    </Link>
  );
}

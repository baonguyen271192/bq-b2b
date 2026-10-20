"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Trash2, ShoppingCart } from "lucide-react";
import { api, Dealer, Product, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";
import EmptyState from "@/components/EmptyState";

const TIER_PCT: Record<string, number> = { "Đồng": 0, "Bạc": 0.03, "Vàng": 0.05, "Kim Cương": 0.08 };

export default function CartPage() {
  const { cart, dealer, removeFromCart, setSizeQty } = useStore();
  const [d, setD] = useState<Dealer | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, Record<string, number>>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    api.dealer(dealer).then(setD).catch(() => {});
    api.products("").then((ps: Product[]) => setStockMap(Object.fromEntries(ps.map((p) => [p.code, p.sizes])))).catch(() => {});
  }, [dealer]);
  // Chọn theo TỪNG SIZE — key = "code:size". Mặc định chọn hết.
  const K = (code: string, s: string) => `${code}:${s}`;
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      cart.forEach((l) => Object.keys(l.sizes).forEach((s) => { next[K(l.code, s)] = prev[K(l.code, s)] ?? true; }));
      return next;
    });
  }, [cart]);

  const isSelSize = (code: string, s: string) => selected[K(code, s)] ?? true;
  const toggleSize = (code: string, s: string) => setSelected((p) => ({ ...p, [K(code, s)]: !isSelSize(code, s) }));
  const lineAllSel = (l: (typeof cart)[number]) => Object.keys(l.sizes).every((s) => isSelSize(l.code, s));
  const toggleLine = (l: (typeof cart)[number]) => {
    const v = !lineAllSel(l);
    setSelected((p) => ({ ...p, ...Object.fromEntries(Object.keys(l.sizes).map((s) => [K(l.code, s), v])) }));
  };
  const allSel = cart.length > 0 && cart.every((l) => lineAllSel(l));
  const toggleAll = () => {
    const v = !allSel;
    const next: Record<string, boolean> = {};
    cart.forEach((l) => Object.keys(l.sizes).forEach((s) => { next[K(l.code, s)] = v; }));
    setSelected(next);
  };

  // Chỉ các size đã chọn của 1 sản phẩm
  const selSizesOf = (l: (typeof cart)[number]) =>
    Object.fromEntries(Object.entries(l.sizes).filter(([s]) => isSelSize(l.code, s)));
  const selPairs = (l: (typeof cart)[number]) => Object.values(selSizesOf(l)).reduce((a, b) => a + b, 0);
  const selLineTotal = (l: (typeof cart)[number]) => selPairs(l) * l.unit_price;

  const subtotal = cart.reduce((s, l) => s + selLineTotal(l), 0);
  const totalPairs = cart.reduce((s, l) => s + selPairs(l), 0);
  const selCount = cart.filter((l) => selPairs(l) > 0).length; // số SP có ít nhất 1 size chọn
  // sel param: danh sách "code:size" đã chọn
  const selKeys = cart.flatMap((l) => Object.keys(selSizesOf(l)).map((s) => K(l.code, s)));
  const pct = d ? (TIER_PCT[d.tier] ?? 0) : 0;
  const gross = pct < 1 ? Math.round(subtotal / (1 - pct)) : subtotal;
  const discount = gross - subtotal;
  const avail = d?.credit_available ?? 0;

  if (cart.length === 0) return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <CartHeader n={0} />
      <EmptyState Icon={ShoppingCart} title="Đơn nháp đang trống"
        subtitle="Chọn sản phẩm sỉ và nhập số lượng theo size để tạo đơn."
        actionLabel="Chọn sản phẩm sỉ" actionHref="/products" />
    </div>
  );

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <CartHeader n={cart.length} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px 180px" }}>
        {/* Chọn tất cả */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 8, padding: "12px 14px", cursor: "pointer" }}>
          <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width: 18, height: 18, accentColor: "var(--bq-orange)" }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Chọn tất cả các size</span>
        </label>
        {/* Cart items */}
        {cart.map((l) => (
          <div key={l.code} style={{ background: "#fff", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <input type="checkbox" checked={lineAllSel(l)} onChange={() => toggleLine(l)}
                style={{ width: 18, height: 18, accentColor: "var(--bq-orange)", marginTop: 20, flexShrink: 0 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt={l.name} style={{ width: 60, height: 60, borderRadius: 4, objectFit: "cover", background: "#f0f1f3" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className="font-head" style={{ fontSize: 14, fontWeight: 700 }}>{l.name}</span>
                <span style={{ fontSize: 11, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>SKU: {l.code} · Giá sỉ {vnd(l.unit_price)}</span>
              </div>
              <button onClick={() => removeFromCart(l.code)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bq-red)", alignSelf: "flex-start" }}>
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
            {/* Chọn + sửa số lượng TỪNG SIZE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--bq-line)", paddingTop: 10 }}>
              {Object.entries(l.sizes).map(([s, q]) => {
                const stock = stockMap[l.code]?.[s] ?? 999;
                const on = isSelSize(l.code, s);
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", opacity: on ? 1 : 0.5 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={on} onChange={() => toggleSize(l.code, s)}
                        style={{ width: 16, height: 16, accentColor: "var(--bq-orange)" }} />
                      <span style={{ fontSize: 13, fontFamily: "var(--font-geist)" }}>Size <b>{s}</b>{stock !== 999 && <span style={{ color: "var(--bq-muted)", fontSize: 12 }}> · tồn {stock}</span>}</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => setSizeQty(l.code, s, q - 1)} style={stepBtn}>−</button>
                      <span style={{ width: 30, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-geist)" }}>{q}</span>
                      <button onClick={() => setSizeQty(l.code, s, Math.min(stock, q + 1))} disabled={q >= stock} style={stepBtn}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ height: 1, background: "var(--bq-line)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>Đã chọn {selPairs(l)} đôi</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>{vnd(selLineTotal(l))}</span>
            </div>
          </div>
        ))}

        <Link href="/products" style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--bq-gold)", textDecoration: "none", fontFamily: "var(--font-geist)" }}>
          + Tiếp tục chọn sản phẩm sỉ
        </Link>

        {/* Chi tiết giá trị */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="font-head" style={{ fontSize: 13, fontWeight: 700, color: "var(--bq-orange)" }}>CHI TIẾT GIÁ TRỊ</span>
          <SumRow label={`Tổng sỉ tạm tính (${totalPairs} đôi):`} value={vnd(gross)} valueColor="var(--bq-ink)" />
          <SumRow label={`Chiết khấu thương mại (${(pct * 100).toFixed(0)}%):`} value={`-${vnd(discount)}`} valueColor="var(--bq-red)" />
          <SumRow label="Phí vận chuyển sỉ:" value="Miễn phí" valueColor="var(--bq-green)" />
          <div style={{ height: 1, background: "var(--bq-line)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>Tổng ước tính thanh toán:</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>{vnd(subtotal)}</span>
          </div>
        </div>

        {/* Khấu trừ công nợ (xanh) */}
        <div style={{ background: "#dbeafe", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="font-head" style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6" }}>KHẤU TRỪ VÀO CÔNG NỢ KHẢ DỤNG</span>
          <SumRow label="Khả dụng trước đơn:" value={vnd(avail)} labelColor="var(--bq-ink)" valueColor="var(--bq-ink)" bold />
          <SumRow label="Trừ giá trị đơn này:" value={`-${vnd(subtotal)}`} labelColor="var(--bq-ink)" valueColor="var(--bq-red)" bold />
          <div style={{ height: 1, background: "#bcd4f5" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", fontFamily: "var(--font-geist)" }}>Khả dụng còn lại:</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6", fontFamily: "var(--font-geist)" }}>{vnd(Math.max(0, avail - subtotal))}</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430,
        background: "#fff", borderTop: "1px solid var(--bq-line)", padding: "12px 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>
            Đã chọn {selCount} SP · {totalPairs} đôi
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>{vnd(subtotal)}</span>
        </div>
        {selKeys.length > 0 ? (
          <Link href={`/checkout?sel=${encodeURIComponent(selKeys.join(","))}`} className="font-head"
            style={{ height: 48, borderRadius: 8, background: "var(--bq-orange)", color: "#fff", fontSize: 16, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            Tiếp tục đặt hàng ({selCount})
          </Link>
        ) : (
          <div className="font-head" style={{ height: 48, borderRadius: 8, background: "#d8dbe0", color: "#fff", fontSize: 16, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            Chọn sản phẩm để đặt
          </div>
        )}
      </div>
    </div>
  );
}

function CartHeader({ n }: { n: number }) {
  return (
    <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", gap: 8,
      position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--bq-line)" }}>
      <Link href="/products" style={{ color: "var(--bq-orange)", display: "flex" }}><ChevronLeft size={22} /></Link>
      <span className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>Đơn hàng nháp ({n})</span>
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid var(--bq-line)", background: "#fff",
  fontSize: 18, fontWeight: 700, color: "var(--bq-ink)", cursor: "pointer", lineHeight: 1,
};

function SumRow({ label, value, labelColor, valueColor, bold }: { label: string; value: string; labelColor?: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: labelColor || "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{label}</span>
      <span style={{ fontSize: bold ? 12 : 13, fontWeight: bold ? 700 : 600, color: valueColor || "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{value}</span>
    </div>
  );
}

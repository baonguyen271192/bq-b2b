"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { api, Dealer, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";
import { getWarehouse } from "@/lib/warehouses";

const TIER_PCT: Record<string, number> = { "Đồng": 0, "Bạc": 0.03, "Vàng": 0.05, "Kim Cương": 0.08 };

function ReviewInner() {
  const { cart, dealer, clearCart, setSizeQty } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const payment = params.get("payment") || "Công nợ 30 ngày";
  const warehouse = params.get("warehouse") || "Kho tổng Q.5 (Mặc định)";
  const buyNote = params.get("buyNote") || "";
  const shipNote = params.get("shipNote") || "";
  const sel = params.get("sel");
  const [d, setD] = useState<Dealer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.dealer(dealer).then(setD).catch(() => {}); }, [dealer]);

  // sel = danh sách "code:size" đã chọn → lọc từng size trong mỗi sản phẩm
  const selSet = sel ? new Set(decodeURIComponent(sel).split(",")) : null;
  const lines = (selSet
    ? cart.map((l) => ({ ...l, sizes: Object.fromEntries(Object.entries(l.sizes).filter(([s]) => selSet.has(`${l.code}:${s}`))) }))
          .filter((l) => Object.keys(l.sizes).length > 0)
    : cart);

  const pairs = (sz: Record<string, number>) => Object.values(sz).reduce((a, b) => a + b, 0);
  const subtotal = lines.reduce((s, l) => s + pairs(l.sizes) * l.unit_price, 0);
  const totalPairs = lines.reduce((s, l) => s + pairs(l.sizes), 0);
  const pct = d ? (TIER_PCT[d.tier] ?? 0) : 0;
  const gross = pct < 1 ? Math.round(subtotal / (1 - pct)) : subtotal;
  const avail = d?.credit_available ?? 0;

  const submit = async () => {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        dealer_code: dealer, lines: lines.map((l) => ({ code: l.code, sizes: l.sizes })),
        delivery: warehouse, payment, channel: "app",
      });
      // Chỉ xoá các SIZE đã đặt khỏi giỏ (giữ lại size chưa chọn)
      if (selSet) lines.forEach((l) => Object.keys(l.sizes).forEach((s) => setSizeQty(l.code, s, 0)));
      else clearCart();
      router.push(`/order-success/${order.id}`);
    } catch (e) { alert("Lỗi: " + e); setSubmitting(false); }
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", gap: 8,
        position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--bq-line)" }}>
        <Link href="/checkout" style={{ color: "var(--bq-orange)", display: "flex" }}><ChevronLeft size={22} /></Link>
        <span className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>Xem lại đơn hàng</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        {/* Sản phẩm */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bq-muted)", marginBottom: 12, letterSpacing: .3 }}>
            SẢN PHẨM · {lines.length} mẫu · {totalPairs} đôi
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lines.map((l) => (
              <div key={l.code} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-head" style={{ fontSize: 14, fontWeight: 700 }}>{l.name}</div>
                  <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 2, fontFamily: "var(--font-geist)" }}>
                    Size {Object.keys(l.sizes).join(", ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 12, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{pairs(l.sizes)} đôi</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>{vnd(pairs(l.sizes) * l.unit_price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Giao hàng & thanh toán */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--bq-muted)", letterSpacing: .3 }}>GIAO HÀNG &amp; THANH TOÁN</span>
            <Link href="/checkout" style={{ fontSize: 13, color: "var(--bq-orange)", textDecoration: "none", fontWeight: 600 }}>Sửa</Link>
          </div>
          <div style={{ fontSize: 14, marginBottom: 2 }}>{warehouse.replace(" (Mặc định)", "")}</div>
          <div style={{ fontSize: 13, color: "var(--bq-muted)" }}>{getWarehouse(warehouse)?.address || "—"}</div>
          {getWarehouse(warehouse) && (
            <div style={{ fontSize: 13, color: "var(--bq-muted)", marginTop: 2 }}>
              Người nhận: {getWarehouse(warehouse)?.receiver} · {getWarehouse(warehouse)?.phone}
            </div>
          )}
          <div style={{ height: 1, background: "var(--bq-line)", margin: "10px 0" }} />
          <div style={{ fontSize: 14 }}>Thanh toán: <b style={{ color: "var(--bq-orange)" }}>{payment}</b></div>
          {(buyNote || shipNote) && (
            <div style={{ marginTop: 10, background: "var(--bq-bg)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {buyNote && <NoteLine label="Ghi chú mua hàng" value={buyNote} />}
              {shipNote && <NoteLine label="Ghi chú vận chuyển" value={shipNote} />}
            </div>
          )}
        </div>

        {/* Tổng tiền */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <SumRow label="Tổng sỉ tạm tính" value={vnd(gross)} />
          <SumRow label="Chiết khấu thương mại" value={`-${vnd(gross - subtotal)}`} color="var(--bq-red)" />
          <SumRow label="Phí vận chuyển sỉ" value="Miễn phí" color="var(--bq-green)" />
          <div style={{ height: 1, background: "var(--bq-line)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ color: "var(--bq-orange)", fontSize: 15, fontFamily: "var(--font-geist)" }}>Tổng cộng</b>
            <b style={{ color: "var(--bq-orange)", fontSize: 20, fontFamily: "var(--font-geist)" }}>{vnd(subtotal)}</b>
          </div>
        </div>

        {/* Khấu trừ công nợ (xanh nhạt) */}
        <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <ShieldCheck size={18} color="#3b82f6" />
            <span className="font-head" style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>KHẤU TRỪ VÀO HẠN MỨC CÔNG NỢ</span>
          </div>
          <SumRow label="Hạn mức khả dụng" value={vnd(avail)} bold />
          <SumRow label="Khấu trừ đơn này" value={`-${vnd(subtotal)}`} color="var(--bq-red)" bold />
          <div style={{ height: 1, background: "#cfe0f9" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ color: "#3b82f6", fontSize: 14, fontFamily: "var(--font-geist)" }}>Còn lại sau đơn</b>
            <b style={{ color: "#3b82f6", fontSize: 16, fontFamily: "var(--font-geist)" }}>{vnd(Math.max(0, avail - subtotal))}</b>
          </div>
        </div>
      </div>

      {/* Nút dính đáy */}
      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid var(--bq-line)",
        padding: "12px 16px 20px", display: "flex", gap: 12 }}>
        <Link href="/cart" className="btn-outline" style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "13px" }}>Quay lại</Link>
        <button onClick={submit} disabled={submitting} className="font-head"
          style={{ flex: 2, height: 48, borderRadius: 12, border: "none", background: "var(--bq-orange)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          {submitting ? "Đang gửi…" : "Gửi đơn hàng"}
        </button>
      </div>
    </div>
  );
}

function NoteLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 13, fontFamily: "var(--font-geist)" }}>
      <span style={{ color: "var(--bq-muted)" }}>📝 {label}: </span>
      <span style={{ color: "var(--bq-ink)" }}>{value}</span>
    </div>
  );
}

function SumRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{label}</span>
      <span style={{ color: color || "var(--bq-ink)", fontWeight: bold ? 700 : 600, fontFamily: "var(--font-geist)" }}>{value}</span>
    </div>
  );
}

export default function ReviewPage() {
  return <Suspense><ReviewInner /></Suspense>;
}

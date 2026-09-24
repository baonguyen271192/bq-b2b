"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronDown, Plus, Minus } from "lucide-react";
import { api, Dealer } from "@/lib/api";
import { useStore } from "@/lib/store";
import { WAREHOUSES, WH_KEYS } from "@/lib/warehouses";

const PAYMENTS = ["Chuyển khoản ngân hàng", "Tiền mặt khi nhận (COD sỉ)", "Công nợ 30 ngày"];

function CheckoutInner() {
  const { cart, dealer } = useStore();
  const router = useRouter();
  const sel = useSearchParams().get("sel") || "";
  const [d, setD] = useState<Dealer | null>(null);
  const [warehouse, setWarehouse] = useState("Kho tổng Q.5 (Mặc định)");
  const [payment, setPayment] = useState("Công nợ 30 ngày");
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { api.dealer(dealer).then(setD).catch(() => {}); }, [dealer]);

  const goReview = () => {
    if (cart.length === 0) return;
    const p = new URLSearchParams({ payment, warehouse });
    if (sel) p.set("sel", sel);
    const buy = notes["Ghi chú mua hàng / Đóng gói"];
    const ship = notes["Ghi chú vận chuyển (Xe tải / chành xe)"];
    if (buy) p.set("buyNote", buy);
    if (ship) p.set("shipNote", ship);
    router.push(`/review?${p.toString()}`);
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", gap: 8,
        position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--bq-line)" }}>
        <Link href="/cart" style={{ color: "var(--bq-orange)", display: "flex" }}><ChevronLeft size={22} /></Link>
        <span className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>Thông tin đặt hàng</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 16px 120px" }}>
        {/* Địa chỉ */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="font-head" style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)" }}>ĐỊA CHỈ NHẬN HÀNG SỈ</span>
          <div>
            <div style={{ fontSize: 12, color: "var(--bq-muted)", marginBottom: 6 }}>Địa chỉ nhận hàng của đại lý</div>
            <button onClick={() => setWarehouseOpen(!warehouseOpen)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                border: `1px solid ${warehouseOpen ? "var(--bq-orange)" : "var(--bq-line)"}`, background: "#fff",
                borderRadius: 8, padding: "12px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-geist)" }}>
              {warehouse} <ChevronDown size={18} color="var(--bq-muted)" style={{ transform: warehouseOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {warehouseOpen && (
              <div style={{ marginTop: 6, border: "1px solid var(--bq-line)", borderRadius: 8, overflow: "hidden" }}>
                {WH_KEYS.map((w) => (
                  <div key={w} onClick={() => { setWarehouse(w); setWarehouseOpen(false); }}
                    style={{ padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid var(--bq-line)",
                      background: w === warehouse ? "var(--bq-orange-soft)" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: w === warehouse ? 700 : 600,
                        color: w === warehouse ? "var(--bq-orange)" : "var(--bq-ink)" }}>{w}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, background: "var(--bq-bg)", color: "var(--bq-muted)", padding: "1px 7px", borderRadius: 4 }}>{WAREHOUSES[w].tag}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 2 }}>{WAREHOUSES[w].address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>Chi tiết địa chỉ</div>
            <div style={{ fontSize: 14 }}>{WAREHOUSES[warehouse]?.address}</div>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>Người nhận hàng</div>
              <div style={{ fontSize: 14 }}>{WAREHOUSES[warehouse]?.receiver}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>Số điện thoại</div>
              <div style={{ fontSize: 14 }}>{WAREHOUSES[warehouse]?.phone}</div>
            </div>
          </div>
        </div>

        {/* Thanh toán B2B */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="font-head" style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)", marginBottom: 6 }}>HÌNH THỨC THANH TOÁN B2B</span>
          {PAYMENTS.map((p) => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer" }}>
              <input type="radio" checked={payment === p} onChange={() => setPayment(p)} style={{ accentColor: "var(--bq-orange)", width: 18, height: 18 }} />
              <span style={{ fontSize: 14, fontWeight: payment === p ? 700 : 500 }}>{p}</span>
            </label>
          ))}
        </div>

        {/* Ghi chú — bấm để mở ô nhập */}
        {["Ghi chú mua hàng / Đóng gói", "Ghi chú vận chuyển (Xe tải / chành xe)"].map((n) => {
          const open = !!openNotes[n];
          const filled = !!notes[n];
          return (
            <div key={n} style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
              <button onClick={() => setOpenNotes((prev) => ({ ...prev, [n]: !prev[n] }))}
                style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex",
                  justifyContent: "space-between", alignItems: "flex-start", gap: 12, cursor: "pointer", fontFamily: "var(--font-geist)", textAlign: "left" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "var(--bq-ink)" }}>{n}</div>
                  {!open && filled && (
                    <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 3, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>“{notes[n]}”</div>
                  )}
                </div>
                {open ? <Minus size={18} color="var(--bq-orange)" /> : <Plus size={18} color="var(--bq-muted)" />}
              </button>
              {open && (
                <div style={{ padding: "0 16px 14px" }}>
                  <textarea autoFocus rows={2} value={notes[n] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [n]: e.target.value }))}
                    placeholder="Nhập ghi chú…"
                    style={{ width: "100%", border: "1px solid var(--bq-line)", borderRadius: 8, padding: 10,
                      fontSize: 14, fontFamily: "var(--font-geist)", resize: "none", outline: "none" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430,
        background: "#fff", borderTop: "1px solid var(--bq-line)", padding: "12px 16px 20px" }}>
        <button onClick={goReview} disabled={cart.length === 0} className="font-head"
          style={{ width: "100%", height: 48, borderRadius: 8, border: "none", fontSize: 16, fontWeight: 700, color: "#fff",
            background: cart.length === 0 ? "#d8dbe0" : "var(--bq-orange)", cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>
          Xem lại đơn hàng
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutInner /></Suspense>;
}

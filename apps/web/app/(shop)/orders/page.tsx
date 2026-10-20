"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, FileText, Truck, X, Download, ClipboardList } from "lucide-react";
import TabHeader from "@/components/TabHeader";
import EmptyState from "@/components/EmptyState";
import { api, Order, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";

const statusStyle = (s: string): { bg: string; fg: string } => {
  if (s.includes("đóng gói") || s.includes("chuẩn bị")) return { bg: "#dbeafe", fg: "#3b82f6" };
  if (s.includes("bàn giao") || s.includes("giao") && !s.includes("đã giao")) return { bg: "#dbeafe", fg: "#3b82f6" };
  if (s.includes("xác nhận") || s.includes("duyệt")) return { bg: "var(--bq-amber-soft)", fg: "var(--bq-amber)" };
  if (s.includes("nhận") || s.includes("hoàn")) return { bg: "var(--bq-green-soft)", fg: "var(--bq-green)" };
  if (s.includes("huỷ") || s.includes("từ chối")) return { bg: "#fde8e8", fg: "var(--bq-red)" };
  return { bg: "#eef2f7", fg: "#5b6472" };
};

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "packing", label: "Đóng gói" },
  { key: "shipping", label: "Đang giao" },
];

function OrdersInner() {
  const { dealer, addToCart } = useStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  const [vatFor, setVatFor] = useState<Order | null>(null); // đơn đang xem hoá đơn VAT

  useEffect(() => {
    const load = () => api.orders(dealer).then(setOrders).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [dealer]);
  useEffect(() => { api.products("").then((ps) => setImgMap(Object.fromEntries(ps.map((p) => [p.code, p.image])))).catch(() => {}); }, []);

  const reorder = (o: Order) => {
    o.items.forEach((it) => addToCart({ code: it.code, name: it.name, image: imgMap[it.code] || "", unit_price: it.unit_price, sizes: it.sizes }));
    router.push("/cart");
  };

  const match = (o: Order) => {
    if (tab === "pending") return o.status.includes("xác nhận") || o.status.includes("duyệt");
    if (tab === "packing") return o.status.includes("đóng gói");
    if (tab === "shipping") return o.status.includes("bàn giao");
    return true;
  };
  const shown = orders.filter(match).filter((o) =>
    q ? (o.id + o.items.map((i) => i.name).join()).toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TabHeader title="Đơn hàng" />

      {/* Tabs */}
      <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 16px 0" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ border: `1px solid ${tab === t.key ? "var(--bq-orange)" : "var(--bq-line)"}`,
              background: tab === t.key ? "var(--bq-orange)" : "#fff", color: tab === t.key ? "#fff" : "var(--bq-ink)",
              borderRadius: 20, padding: "7px 16px", fontSize: 13, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "var(--font-geist)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 0" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff",
          border: "1px solid var(--bq-line)", borderRadius: 12, padding: "11px 14px" }}>
          <Search size={18} color="var(--bq-muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã đơn, sản phẩm sỉ…"
            style={{ border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent", fontFamily: "var(--font-geist)" }} />
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gap: 12, padding: "12px 16px 96px" }}>
        {shown.length === 0 && (
          <EmptyState Icon={ClipboardList} title="Chưa có đơn hàng"
            subtitle="Bạn chưa có đơn sỉ nào. Tạo đơn đầu tiên để bắt đầu nhập hàng."
            actionLabel="Tạo đơn hàng" actionHref="/products" />
        )}
        {shown.map((o) => {
          const c = statusStyle(o.status);
          const pairs = o.items.reduce((n, i) => n + i.qty_total, 0);
          const done = o.status.includes("đã nhận"); // chỉ đơn đã giao (không tính "Chờ xác nhận")
          return (
            <div key={o.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid var(--bq-line)", minWidth: 0 }}>
              <Link href={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-geist)" }}>{o.id}</span>
                  <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    {o.status.replace(" (vượt hạn mức)", "")}
                  </span>
                </div>
                {/* Tóm tắt sản phẩm — biết ngay đơn gồm hàng gì */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  {imgMap[o.items[0]?.code] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgMap[o.items[0].code]} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", background: "#eef1f5", flexShrink: 0 }} />
                  ) : <div style={{ width: 40, height: 40, borderRadius: 8, background: "#eef1f5", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1} mẫu` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{o.created_at} • {pairs} đôi sỉ</div>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--bq-orange)", fontFamily: "var(--font-geist)", whiteSpace: "nowrap" }}>{vnd(o.subtotal)}</span>
                </div>
              </Link>
              {/* Action row theo trạng thái đơn (B2B) */}
              {(() => {
                const shipping = o.status.includes("đóng gói") || o.status.includes("bàn giao");
                if (done) return (
                  <div style={{ display: "flex", gap: 10, marginTop: 10, borderTop: "1px solid var(--bq-line)", paddingTop: 10 }}>
                    <button onClick={() => setVatFor(o)} style={secBtn}><FileText size={14} /> Hoá đơn VAT</button>
                    <button onClick={() => reorder(o)} style={priBtn}><RotateCcw size={14} /> Mua lại</button>
                  </div>
                );
                if (shipping) return (
                  <div style={{ display: "flex", gap: 10, marginTop: 10, borderTop: "1px solid var(--bq-line)", paddingTop: 10 }}>
                    <Link href={`/orders/${o.id}`} style={{ ...priBtn, textDecoration: "none" }}><Truck size={14} /> Theo dõi đơn</Link>
                  </div>
                );
                return null;
              })()}
            </div>
          );
        })}
      </div>

      {/* Popup Hoá đơn VAT (nhu cầu B2B) */}
      {vatFor && (
        <div onClick={() => setVatFor(null)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 430, background: "#fff", borderRadius: "20px 20px 0 0", padding: "18px 16px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span className="font-head" style={{ fontSize: 17, fontWeight: 700 }}>Hoá đơn VAT</span>
              <button onClick={() => setVatFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bq-muted)" }}><X size={20} /></button>
            </div>
            <div style={{ background: "var(--bq-bg)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <VatRow label="Số hoá đơn" value={`HD-${vatFor.id.replace("BQ", "")}`} />
              <VatRow label="Đơn hàng" value={vatFor.id} />
              <VatRow label="Ngày xuất" value={vatFor.created_at} />
              <VatRow label="Đơn vị" value={vatFor.dealer_name} />
              <VatRow label="MST bên bán (BQ)" value="0400123456" />
              <div style={{ height: 1, background: "var(--bq-line)" }} />
              <VatRow label="Tổng tiền (đã gồm VAT)" value={vnd(vatFor.subtotal)} strong />
            </div>
            <button onClick={() => openInvoice(vatFor)} className="font-head" style={{ ...priBtn, width: "100%", height: 48, marginTop: 16, justifyContent: "center", fontSize: 15 }}>
              <Download size={18} /> Tải hoá đơn PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mở hoá đơn VAT dạng HTML in được → người dùng "Lưu dưới dạng PDF" từ hộp thoại in.
function openInvoice(o: Order) {
  const rows = o.items.map((it) =>
    `<tr><td>${it.name}</td><td style="text-align:center">${Object.entries(it.sizes).map(([s, q]) => `${s}×${q}`).join(", ")}</td><td style="text-align:right">${it.qty_total}</td><td style="text-align:right">${vnd(it.unit_price)}</td><td style="text-align:right">${vnd(it.line_total)}</td></tr>`
  ).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hoá đơn ${o.id}</title>
    <style>body{font-family:system-ui,Arial;padding:32px;color:#1e293b} h1{color:#e8541e;margin:0 0 4px} .muted{color:#64748b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px} th,td{border-bottom:1px solid #e2e8f0;padding:8px} th{text-align:left;color:#64748b}
    .tot{text-align:right;margin-top:16px;font-size:18px;font-weight:700;color:#e8541e}</style></head>
    <body>
      <h1>GIÀY BQ — HOÁ ĐƠN GTGT</h1>
      <div class="muted">Số HĐ: HD-${o.id.replace("BQ", "")} · Ngày xuất: ${o.created_at} · MST: 0400123456</div>
      <div class="muted">Khách hàng: ${o.dealer_name} (${o.dealer_code}) · Thanh toán: ${o.payment}</div>
      <table><thead><tr><th>Sản phẩm</th><th style="text-align:center">Size</th><th style="text-align:right">SL</th><th style="text-align:right">Đơn giá</th><th style="text-align:right">Thành tiền</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot">Tổng cộng (đã gồm VAT): ${vnd(o.subtotal)}</div>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

const secBtn: React.CSSProperties = { flex: 1, padding: "8px", borderRadius: 8, border: "1px solid var(--bq-line)",
  background: "#fff", color: "var(--bq-ink)", fontSize: 13, fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 5 };
const priBtn: React.CSSProperties = { flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid var(--bq-orange)",
  background: "#fff", color: "var(--bq-orange)", fontSize: 13, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 5 };

function VatRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--bq-muted)" }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, color: strong ? "var(--bq-orange)" : "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{value}</span>
    </div>
  );
}

export default function OrdersPage() {
  return <OrdersInner />;
}

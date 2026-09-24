"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { api, Order, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";
import { getWarehouse } from "@/lib/warehouses";

const STAGES = [
  { key: "Chờ xác nhận", label: "Đã gửi đơn sỉ thành công" },
  { key: "Đã xác nhận", label: "BQ Xác nhận đơn hàng" },
  { key: "Đang đóng gói", label: "Đang chuẩn bị đóng gói", sub: "Đang xử lý tại kho sỉ BQ" },
  { key: "Đang bàn giao vận chuyển", label: "Đang bàn giao vận chuyển" },
  { key: "Đại lý đã nhận", label: "Đã bàn giao đại lý nhận" },
];
const statusStyle = (s: string) =>
  s.includes("đóng gói") || s.includes("bàn giao") || s.includes("chuẩn bị") ? { bg: "#dbeafe", fg: "#3b82f6" }
  : s.includes("xác nhận") || s.includes("duyệt") ? { bg: "var(--bq-amber-soft)", fg: "var(--bq-amber)" }
  : s.includes("nhận") ? { bg: "var(--bq-green-soft)", fg: "var(--bq-green)" }
  : s.includes("huỷ") || s.includes("từ chối") ? { bg: "#fde8e8", fg: "var(--bq-red)" }
  : { bg: "var(--bq-amber-soft)", fg: "var(--bq-amber)" };

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToCart } = useStore();
  const [o, setO] = useState<Order | null>(null);
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceive, setConfirmingReceive] = useState(false);
  useEffect(() => { const l = () => api.order(id).then(setO).catch(() => {}); l(); const t = setInterval(l, 4000); return () => clearInterval(t); }, [id]);
  useEffect(() => { api.products("").then((ps) => setImgMap(Object.fromEntries(ps.map((p) => [p.code, p.image])))).catch(() => {}); }, []);

  const doCancel = async () => {
    setCancelling(true);
    try { await api.cancel(id); setConfirmCancel(false); await api.order(id).then(setO); }
    finally { setCancelling(false); }
  };

  // Chính đại lý (bên NHẬN hàng) tự xác nhận đã nhận — không chỉ BQ mới xác nhận được.
  const doConfirmReceive = async () => {
    setConfirmingReceive(true);
    try { await api.advance(id); await api.order(id).then(setO); }
    finally { setConfirmingReceive(false); }
  };

  if (!o) return (<div><Head title={id} /><div style={{ padding: 40, textAlign: "center", color: "var(--bq-muted)" }}>Đang tải…</div></div>);

  const pairs = o.items.reduce((n, i) => n + i.qty_total, 0);
  const curIdx = STAGES.findIndex((s) => s.key === o.status);
  const badge = statusStyle(o.status);
  const isDebt = o.payment.includes("nợ") || o.payment.includes("Công nợ");

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <Head title={o.id} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 16px 120px" }}>
        {/* Đơn hàng B2B */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SecTitle>ĐƠN HÀNG B2B</SecTitle>
            <span style={{ background: badge.bg, color: badge.fg, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
              {o.status.replace(" (vượt hạn mức)", "")}
            </span>
          </div>
          <Row label="Ngày đặt" value={o.created_at} />
          <Row label="Tổng số lượng sỉ:" value={`${o.items.length} sản phẩm / ${pairs} đôi`} bold />
          <Row label="Tổng ước tính thanh toán:" value={vnd(o.subtotal)} valueColor="var(--bq-orange)" bold />
        </Card>

        {/* Trạng thái xử lý (timeline) */}
        {!o.status.includes("duyệt") && !o.status.includes("từ chối") && !o.status.includes("huỷ") && (
          <Card>
            <SecTitle>TRẠNG THÁI XỬ LÝ</SecTitle>
            <div style={{ marginTop: 12 }}>
              {STAGES.map((st, i) => {
                const isLast = curIdx === STAGES.length - 1; // đơn đã tới bước cuối = hoàn tất
                const done = i < curIdx || (i === curIdx && isLast);
                const current = i === curIdx && !isLast;
                return (
                  <div key={st.key} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%",
                        background: done ? "var(--bq-green-soft)" : current ? "#fff" : "#eef1f5",
                        border: current ? "3px solid var(--bq-orange)" : "none",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {done && <Check size={13} color="var(--bq-green)" strokeWidth={3} />}
                        {!done && !current && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#9aa4b2" }} />}
                      </div>
                      {i < STAGES.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: done ? "var(--bq-green)" : "#e5e8ee" }} />}
                    </div>
                    <div style={{ paddingBottom: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: done || current ? 700 : 500,
                        color: current ? "var(--bq-orange)" : done ? "var(--bq-ink)" : "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{st.label}</div>
                      {current && st.sub && <div style={{ fontSize: 12, color: "var(--bq-orange)" }}>{st.sub}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Sản phẩm đã chọn */}
        <div>
          <SecTitle style={{ marginBottom: 10, display: "block" }}>SẢN PHẨM ĐÃ CHỌN</SecTitle>
          <div style={{ display: "grid", gap: 12 }}>
            {o.items.map((it) => (
              <Card key={it.code}>
                <div style={{ display: "flex", gap: 12 }}>
                  {imgMap[it.code] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgMap[it.code]} alt={it.name} style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover", background: "#eef1f5", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 6, background: "#eef1f5", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="font-head" style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>SKU: {it.code} • Giá sỉ: {vnd(it.unit_price)}</div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-geist)", marginTop: 2 }}>Size: {Object.entries(it.sizes).map(([s, q]) => `${s} (${q} đôi)`).join(", ")}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "var(--bq-line)", margin: "10px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>Tổng {it.qty_total} đôi</span>
                  <b style={{ color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>{vnd(it.line_total)}</b>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Thanh toán B2B */}
        <Card>
          <SecTitle>THANH TOÁN B2B</SecTitle>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Hình thức sỉ:" value={o.payment} bold />
            <Row label="Trạng thái toán:" value={isDebt ? "Chưa thanh toán" : "Đã thanh toán"} valueColor={isDebt ? "var(--bq-red)" : "var(--bq-green)"} bold />
            <Row label="Đã thanh toán:" value={isDebt ? vnd(0) : vnd(o.subtotal)} bold />
            <Row label="Còn lại cần thu:" value={isDebt ? vnd(o.subtotal) : vnd(0)} valueColor="var(--bq-orange)" bold />
          </div>
        </Card>

        {/* Giao nhận */}
        <Card>
          <SecTitle>GIAO NHẬN HÀNG</SecTitle>
          {(() => {
            const wh = getWarehouse(o.delivery);
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>Địa chỉ giao kho:</div>
                <div style={{ fontSize: 14 }}>{o.delivery.replace(" (Mặc định)", "")}{wh ? ` — ${wh.address}` : ""}</div>
                <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 8 }}>Đại diện nhận sỉ:</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{wh ? `${wh.receiver} — ${wh.phone}` : o.dealer_name}</div>
              </div>
            );
          })()}
        </Card>

        {/* Người duyệt */}
        {o.approver && (
          <div style={{ fontSize: 12, color: "var(--bq-orange)", lineHeight: 1.5 }}>
            Duyệt bởi: <b>{o.approver}</b> — {o.created_at}<br />
            {o.approve_note && <span style={{ color: "var(--bq-muted)" }}>Lý do: {o.approve_note}</span>}
          </div>
        )}
      </div>

      {/* Buttons — đổi theo trạng thái đơn */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430,
        background: "#fff", borderTop: "1px solid var(--bq-line)", padding: "12px 16px 20px", display: "flex", gap: 12 }}>
        {(() => {
          const canCancel = o.status.includes("Chờ xác nhận") || o.status.includes("duyệt");
          const delivered = o.status.includes("đã nhận");
          const awaitingReceive = o.status === "Đang bàn giao vận chuyển";
          const reorder = () => {
            o.items.forEach((it) => addToCart({ code: it.code, name: it.name, image: imgMap[it.code] || "", unit_price: it.unit_price, sizes: it.sizes }));
            router.push("/cart");
          };
          const callBQ = () => { window.location.href = "tel:19006024"; };
          if (canCancel) return (<>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => setConfirmCancel(true)}>Huỷ đơn sỉ</button>
            <button className="font-head" style={ctaStyle} onClick={callBQ}>Liên hệ BQ</button>
          </>);
          // Hàng đã tới nơi — CHÍNH đại lý (bên nhận) tự xác nhận, không phải BQ tự tick hộ.
          // Vẫn đang trong lúc vận chuyển (chưa chắc đã tới) — giữ luôn nút Liên hệ BQ để
          // đại lý báo ngay nếu giao trễ/thiếu/sai, không phải bấm "đã nhận" mới liên hệ được.
          if (awaitingReceive) return (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-outline" disabled={confirmingReceive} onClick={doConfirmReceive}
                  style={{ flex: 1 }}>
                  {confirmingReceive ? "Đang xác nhận…" : "Đã nhận hàng"}
                </button>
                <button className="font-head" style={ctaStyle} onClick={callBQ}>Liên hệ BQ</button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--bq-muted)", textAlign: "center" }}>
                Chỉ bấm khi hàng đã thực sự tới nơi
              </div>
            </div>
          );
          if (delivered) return (<>
            <button className="btn-outline" style={{ flex: 1 }} onClick={reorder}>Mua lại đơn</button>
            <button className="font-head" style={ctaStyle} onClick={callBQ}>Liên hệ BQ</button>
          </>);
          return <button className="font-head" style={{ ...ctaStyle, flex: 1 }} onClick={callBQ}>Liên hệ BQ</button>;
        })()}
      </div>

      {/* Modal xác nhận huỷ */}
      {confirmCancel && (
        <div onClick={() => setConfirmCancel(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div className="font-head" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Huỷ đơn {o.id}?</div>
            <div style={{ fontSize: 13, color: "var(--bq-muted)", lineHeight: 1.5, marginBottom: 18 }}>
              Đơn sẽ bị huỷ và <b style={{ color: "var(--bq-green)" }}>hoàn lại {vnd(o.subtotal)}</b> vào hạn mức công nợ. Thao tác không thể hoàn tác.
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>Không</button>
              <button disabled={cancelling} onClick={doCancel} className="font-head"
                style={{ flex: 1, height: 46, borderRadius: 12, border: "none", background: "var(--bq-red)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {cancelling ? "Đang huỷ…" : "Huỷ đơn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Head({ title }: { title: string }) {
  return (
    <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", gap: 8,
      position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--bq-line)" }}>
      <Link href="/orders" style={{ color: "var(--bq-orange)", display: "flex" }}><ChevronLeft size={22} /></Link>
      <span className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>{title}</span>
    </div>
  );
}
const ctaStyle: React.CSSProperties = { flex: 1, height: 48, borderRadius: 8, border: "none", background: "var(--bq-orange)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" };
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid var(--bq-line)" }}>{children}</div>;
}
function SecTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span className="font-head" style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)", ...style }}>{children}</span>;
}
function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 13, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: valueColor || "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{value}</span>
    </div>
  );
}

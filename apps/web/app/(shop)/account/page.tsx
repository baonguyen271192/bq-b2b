"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck2, Receipt } from "lucide-react";
import { api, CreditDetail, Order, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";
import TabHeader from "@/components/TabHeader";
import EmptyState from "@/components/EmptyState";

export default function DebtPage() {
  const { dealer } = useStore();
  const [c, setC] = useState<CreditDetail | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const load = () => api.credit(dealer).then(setC).catch(() => {});
    load();
    const t = setInterval(load, 4000); // đơn mới → công nợ cập nhật ngay
    return () => clearInterval(t);
  }, [dealer]);

  const usedPct = c && c.credit_limit ? Math.round((c.credit_used / c.credit_limit) * 100) : 0;
  const invStatus = (o: Order & { paid?: boolean }) =>
    o.paid ? { text: "Đã thanh toán", bg: "var(--bq-green-soft)", fg: "var(--bq-green)" }
    : o.status.includes("đã nhận") ? { text: "Đã giao · chưa thanh toán", bg: "var(--bq-amber-soft)", fg: "var(--bq-amber)" }
    : { text: "Chưa thanh toán", bg: "#fde8e8", fg: "var(--bq-red)" };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TabHeader title="Công nợ & Thanh toán" />

      <div style={{ padding: "16px 16px 96px", display: "grid", gap: 18 }}>
        {/* Hạn mức — dữ liệu BE thật */}
        {c && (
          <div className="card" style={{ padding: 18 }}>
            <div className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>HẠN MỨC ĐẠI LÝ</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>Tổng hạn mức:</span>
              <b style={{ fontSize: 16 }}>{vnd(c.credit_limit)}</b>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: "#eef1f5", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, usedPct)}%`, height: "100%", background: usedPct >= 100 ? "var(--bq-red)" : "var(--bq-orange)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
              <span style={{ color: "var(--bq-red)" }}>Đã dùng: {vnd(c.credit_used)} ({usedPct}%)</span>
              <span style={{ color: c.credit_available < 0 ? "var(--bq-red)" : "var(--bq-green)" }}>
                Khả dụng: {vnd(c.credit_available)}
              </span>
            </div>
            {/* Nút hành động ngay trong thẻ hạn mức — thấy liền, khỏi cuộn */}
            <button className="font-head" onClick={() => setGuideOpen(true)}
              style={{ width: "100%", marginTop: 14, height: 44, borderRadius: 10, border: "none",
                background: "var(--bq-orange)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Thanh toán công nợ
            </button>
          </div>
        )}

        {/* Hoá đơn = đơn công nợ THẬT từ BE */}
        <div>
          <div className="font-head" style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>HOÁ ĐƠN CHƯA THANH TOÁN</div>
          <div style={{ display: "grid", gap: 12 }}>
            {c && c.invoices.length === 0 && (
              <div className="card">
                <EmptyState Icon={FileCheck2} title="Chưa có hoá đơn công nợ" compact
                  subtitle="Bạn chưa có khoản công nợ nào cần thanh toán." />
              </div>
            )}
            {c?.invoices.map((o) => {
              const s = invStatus(o);
              return (
                <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Đơn {o.id}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: s.bg, color: s.fg }}>{s.text}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)", margin: "4px 0" }}>Ngày: {o.created_at} · TT: {o.payment}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{o.items.reduce((n, i) => n + i.qty_total, 0)} đôi</div>
                      <b style={{ color: "var(--bq-red)", fontSize: 16 }}>{vnd(o.subtotal)}</b>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Lịch sử giao dịch = thanh toán THẬT trong DB */}
        {c && (
          <div>
            <div className="font-head" style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>LỊCH SỬ GIAO DỊCH</div>
            {c.transactions.length === 0 && (
              <div className="card">
                <EmptyState Icon={Receipt} title="Chưa có giao dịch" compact
                  subtitle="Các lần thanh toán công nợ sẽ hiện ở đây." />
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              {c.transactions.map((t) => (
                <div key={t.id} className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Thanh toán sỉ qua {t.method}</div>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>Mã GD: {t.id}{t.order_id ? ` · Đơn ${t.order_id}` : ""} · {t.created_at}</div>
                  </div>
                  <b style={{ color: "var(--bq-green)", fontSize: 15 }}>+{vnd(t.amount)}</b>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Popup hướng dẫn chuyển khoản */}
      {guideOpen && c && (
        <div onClick={() => setGuideOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 430, background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 28px" }}>
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 16px" }} />
            <div className="font-head" style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>Hướng dẫn thanh toán sỉ</div>
            <div style={{ fontSize: 13, color: "var(--bq-muted)", textAlign: "center", marginBottom: 16 }}>
              Chuyển khoản để tất toán công nợ. Kế toán BQ đối soát theo nội dung CK.
            </div>

            <div style={{ background: "var(--bq-orange-soft)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <GuideRow label="Ngân hàng" value="Vietcombank – CN Đà Nẵng" />
              <GuideRow label="Chủ tài khoản" value="CÔNG TY TNHH GIÀY BQ" />
              <GuideRow label="Số tài khoản" value="0071 0004 12345" copy />
              <GuideRow label={`Tổng công nợ (${c.invoices.filter((i) => !i.paid).length} hoá đơn)`} value={vnd(c.credit_used)} strong />
              <GuideRow label="Nội dung CK" value={`BQ ${dealer} thanh toan cong no`} copy last />
            </div>

            <div style={{ fontSize: 12, color: "var(--bq-muted)", lineHeight: 1.5, marginBottom: 16 }}>
              💡 Ghi <b>đúng nội dung CK</b> để hệ thống tự khớp. Công nợ cập nhật sau khi kế toán xác nhận (thường trong ngày làm việc).
            </div>
            <button className="font-head" onClick={() => setGuideOpen(false)}
              style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: "var(--bq-orange)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GuideRow({ label, value, strong, copy, last }: { label: string; value: string; strong?: boolean; copy?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0",
      borderBottom: last ? "none" : "1px solid rgba(232,84,30,.15)" }}>
      <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: strong ? 15 : 14, fontWeight: strong ? 800 : 600, color: strong ? "var(--bq-orange)" : "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{value}</span>
        {copy && <span onClick={() => navigator.clipboard?.writeText(value)} style={{ fontSize: 12, color: "var(--bq-orange)", cursor: "pointer" }}>Sao chép</span>}
      </span>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Dealer, CreditDetail, vnd } from "@/lib/api";
import { PageHeader, card, th, td, smallBtn, StatusBadge } from "../ui";

export default function CreditPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<CreditDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadDealers = useCallback(() => {
    api.dealers().then((ds) => {
      setDealers(ds);
      setSel((cur) => cur || ds[0]?.code || null);
    }).catch(() => {});
  }, []);
  useEffect(() => { loadDealers(); }, [loadDealers]);

  const loadDetail = useCallback(() => {
    if (sel) api.credit(sel).then(setDetail).catch(() => {});
  }, [sel]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const pay = async (orderId: string) => {
    setBusy(orderId);
    try { await api.payOrder(orderId); loadDetail(); loadDealers(); }
    finally { setBusy(null); }
  };

  const selDealer = dealers.find((d) => d.code === sel);
  const unpaid = detail?.invoices.filter((i) => !i.paid) || [];

  return (
    <div>
      <PageHeader title="Công nợ" subtitle="Theo dõi hạn mức, hoá đơn chưa trả và ghi nhận thanh toán (đại lý)" />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        {/* Danh sách đại lý */}
        <div style={{ ...card, overflow: "hidden" }}>
          {dealers.map((d) => (
            <button key={d.code} onClick={() => { setSel(d.code); setDetail(null); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px",
                border: "none", borderBottom: "1px solid var(--bq-line)", cursor: "pointer",
                background: sel === d.code ? "var(--bq-orange-soft)" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{d.name}</b>
                <span className="tier-badge">{d.tier}</span>
              </div>
              <div style={{ fontSize: 12, color: d.credit_used > 0 ? "#b7791f" : "var(--bq-muted)", marginTop: 3 }}>
                Đã dùng: {vnd(d.credit_used)} / {vnd(d.credit_limit)}
              </div>
            </button>
          ))}
        </div>

        {/* Chi tiết công nợ */}
        <div>
          {selDealer && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
              <MiniTile label="Hạn mức" value={vnd(selDealer.credit_limit)} />
              <MiniTile label="Đã dùng" value={vnd(selDealer.credit_used)} color="#b7791f" />
              <MiniTile label="Khả dụng" value={vnd(selDealer.credit_available)} color="#2e9e5b" />
            </div>
          )}

          <div style={{ ...card, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              Hoá đơn chưa thanh toán ({unpaid.length})</div>
            {unpaid.length === 0 ? (
              <div style={{ color: "var(--bq-muted)", fontSize: 13 }}>Không có hoá đơn nào chưa trả. 🎉</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--bq-muted)", fontSize: 13 }}>
                    <th style={th}>Mã đơn</th><th style={th}>Ngày</th>
                    <th style={{ ...th, textAlign: "right" }}>Số tiền</th>
                    <th style={th}>Trạng thái</th><th style={{ ...th, textAlign: "center" }}>Thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaid.map((o) => (
                    <tr key={o.id} style={{ borderTop: "1px solid var(--bq-line)" }}>
                      <td style={td}><b>{o.id}</b></td>
                      <td style={{ ...td, fontSize: 13, color: "var(--bq-muted)" }}>{o.created_at}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{vnd(o.subtotal)}</td>
                      <td style={td}><StatusBadge status={o.status} /></td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <button disabled={busy === o.id} onClick={() => pay(o.id)}
                          style={{ ...smallBtn, background: "#2e9e5b", color: "#fff" }}>
                          {busy === o.id ? "…" : "Ghi nhận đã trả"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Lịch sử thanh toán</div>
            {(!detail || detail.transactions.length === 0) ? (
              <div style={{ color: "var(--bq-muted)", fontSize: 13 }}>Chưa có giao dịch.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {detail.transactions.map((tx) => (
                  <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14,
                    borderBottom: "1px solid var(--bq-line)", paddingBottom: 8 }}>
                    <span>{tx.created_at} · {tx.method} · đơn {tx.order_id}</span>
                    <b style={{ color: "#2e9e5b" }}>+{vnd(tx.amount)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: color || "var(--bq-ink)" }}>{value}</div>
    </div>
  );
}

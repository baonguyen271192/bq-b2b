"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Dealer, vnd } from "@/lib/api";
import { PageHeader, card, th, td, smallBtn, Modal, Field, inp } from "../ui";

const TIERS = ["Đồng", "Bạc", "Vàng", "Kim Cương"];

export default function DealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [edit, setEdit] = useState<Partial<Dealer> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.dealers().then(setDealers).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      if (isNew) {
        await api.createDealer({
          code: edit.code, name: edit.name, tier: edit.tier || "Đồng",
          credit_limit: Number(edit.credit_limit || 0), owner: edit.owner || "", phone: edit.phone || "",
        });
      } else {
        await api.updateDealer(edit.code!, {
          tier: edit.tier, credit_limit: Number(edit.credit_limit || 0),
          owner: edit.owner, phone: edit.phone,
        });
      }
      setEdit(null); load();
    } catch (e) { console.error(e); alert("Không lưu được. Vui lòng kiểm tra lại thông tin."); }
    finally { setBusy(false); }
  };

  const usedPct = (d: Dealer) =>
    d.credit_limit > 0 ? Math.min(100, Math.round((d.credit_used / d.credit_limit) * 100)) : 0;

  return (
    <div>
      <PageHeader title="Đại lý"
        subtitle="Quản lý đại lý sỉ — bậc chiết khấu, hạn mức công nợ, liên hệ"
        right={<button onClick={() => { setIsNew(true); setEdit({ tier: "Đồng", credit_limit: 0 }); }}
          style={{ ...smallBtn, background: "var(--bq-orange)", color: "#fff", padding: "9px 16px", fontSize: 14 }}>+ Thêm đại lý</button>} />

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafbfc", textAlign: "left", color: "var(--bq-muted)", fontSize: 13 }}>
                <th style={th}>Đại lý</th><th style={th}>Bậc</th><th style={th}>Liên hệ</th>
                <th style={{ ...th, textAlign: "right" }}>Hạn mức</th>
                <th style={th}>Đã dùng / khả dụng</th>
                <th style={{ ...th, textAlign: "center" }}>Sửa</th>
              </tr>
            </thead>
            <tbody>
              {dealers.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "var(--bq-muted)" }}>
                  Chưa có đại lý nào.</td></tr>
              )}
              {dealers.map((d) => (
                <tr key={d.code} style={{ borderTop: "1px solid var(--bq-line)" }}>
                  <td style={td}><b>{d.name}</b>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{d.code}</div></td>
                  <td style={td}><span className="tier-badge">{d.tier}</span></td>
                  <td style={td}>{d.owner || "—"}
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{d.phone || ""}</div></td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{vnd(d.credit_limit)}</td>
                  <td style={{ ...td, minWidth: 180 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#b7791f" }}>{vnd(d.credit_used)}</span>
                      <span style={{ color: "#2e9e5b" }}>{vnd(d.credit_available)}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 6, background: "#eef2f7", overflow: "hidden" }}>
                      <div style={{ width: `${usedPct(d)}%`, height: "100%",
                        background: usedPct(d) > 85 ? "#e05252" : "#f59e0b" }} />
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <button onClick={() => { setIsNew(false); setEdit(d); }}
                      style={{ ...smallBtn, background: "#fff", border: "1px solid var(--bq-line)", color: "var(--bq-ink)" }}>Sửa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal title={isNew ? "Thêm đại lý" : `Sửa ${edit.code}`} onClose={() => setEdit(null)}>
          {isNew && (
            <>
              <Field label="Mã đại lý"><input value={edit.code || ""} style={inp}
                onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Tên đại lý"><input value={edit.name || ""} style={inp}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            </>
          )}
          <Field label="Bậc chiết khấu">
            <select value={edit.tier} style={inp} onChange={(e) => setEdit({ ...edit, tier: e.target.value })}>
              {TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Hạn mức công nợ"><input type="number" value={edit.credit_limit ?? 0} style={inp}
            onChange={(e) => setEdit({ ...edit, credit_limit: +e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Người phụ trách"><input value={edit.owner || ""} style={inp}
              onChange={(e) => setEdit({ ...edit, owner: e.target.value })} /></Field>
            <Field label="SĐT"><input value={edit.phone || ""} style={inp}
              onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => setEdit(null)} style={{ ...smallBtn, background: "#fff", border: "1px solid var(--bq-line)", color: "var(--bq-ink)", padding: "10px 18px" }}>Huỷ</button>
            <button disabled={busy || (isNew && (!edit.code || !edit.name))} onClick={save}
              style={{ ...smallBtn, background: "var(--bq-orange)", color: "#fff", padding: "10px 18px" }}>
              {busy ? "Đang lưu…" : "Lưu"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

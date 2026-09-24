"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Product, vnd } from "@/lib/api";
import { PageHeader, SearchBox, card, th, td, smallBtn } from "../ui";

const emptyForm = { code: "", name: "", category: "Giày Nữ", retail: 0, wholesale: 0, sizesText: "" };
type Form = typeof emptyForm;

const sizesToText = (s: Record<string, number>) =>
  Object.entries(s).map(([k, v]) => `${k}:${v}`).join(", ");
const textToSizes = (t: string): Record<string, number> => {
  const out: Record<string, number> = {};
  t.split(/[,\n;]+/).forEach((part) => {
    const m = part.trim().match(/^(\w+)\s*[:=]\s*(\d+)$/);
    if (m) out[m[1]] = parseInt(m[2], 10);
  });
  return out;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.adminProducts().then(setProducts).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const startAdd = () => { setEditingCode(null); setForm({ ...emptyForm }); };
  const startEdit = (p: Product) => {
    setEditingCode(p.code);
    setForm({ code: p.code, name: p.name, category: p.category, retail: p.retail,
      wholesale: p.wholesale, sizesText: sizesToText(p.sizes) });
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    const body = { code: form.code, name: form.name, category: form.category,
      retail: Number(form.retail), wholesale: Number(form.wholesale), sizes: textToSizes(form.sizesText) };
    try {
      if (editingCode) await api.updateProduct(editingCode, body);
      else await api.createProduct(body);
      setForm(null); load();
    } catch (e) { console.error(e); alert("Không lưu được. Vui lòng kiểm tra lại thông tin."); }
    finally { setBusy(false); }
  };

  const remove = async (code: string) => {
    if (!confirm(`Xoá sản phẩm ${code}?`)) return;
    await api.deleteProduct(code); load();
  };

  const totalStock = (p: Product) => Object.values(p.sizes).reduce((a, b) => a + b, 0);
  const kw = q.trim().toLowerCase();
  const shown = products.filter((p) => !kw ||
    [p.name, p.code, p.category].some((f) => f.toLowerCase().includes(kw)));

  return (
    <div>
      <PageHeader title="Sản phẩm & Tồn kho"
        subtitle="Quản lý mẫu giày, giá lẻ / giá sỉ và tồn kho theo size"
        right={<button onClick={startAdd} style={{ ...smallBtn, background: "var(--bq-orange)", color: "#fff", padding: "9px 16px", fontSize: 14 }}>+ Thêm sản phẩm</button>} />

      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Tìm tên, mã, nhóm sản phẩm…" />
        <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{shown.length} sản phẩm</span>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafbfc", textAlign: "left", color: "var(--bq-muted)", fontSize: 13 }}>
                <th style={th}>Sản phẩm</th><th style={th}>Nhóm</th>
                <th style={{ ...th, textAlign: "right" }}>Giá lẻ</th>
                <th style={{ ...th, textAlign: "right" }}>Giá sỉ</th>
                <th style={th}>Tồn theo size</th>
                <th style={{ ...th, textAlign: "right" }}>Tổng tồn</th>
                <th style={{ ...th, textAlign: "center" }}>Sửa</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "var(--bq-muted)" }}>
                  {products.length === 0 ? "Chưa có sản phẩm nào." : "Không tìm thấy sản phẩm phù hợp."}</td></tr>
              )}
              {shown.map((p) => (
                <tr key={p.code} style={{ borderTop: "1px solid var(--bq-line)" }}>
                  <td style={td}><b>{p.name}</b>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{p.code}</div></td>
                  <td style={td}>{p.category}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{vnd(p.retail)}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--bq-muted)" }}>{vnd(p.wholesale)}</td>
                  <td style={td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 260 }}>
                      {Object.entries(p.sizes).map(([s, n]) => (
                        <span key={s} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6,
                          background: n === 0 ? "#fdeaea" : n <= 5 ? "#fef3c7" : "#eef2f7",
                          color: n === 0 ? "#e05252" : n <= 5 ? "#b7791f" : "#5b6472" }}>
                          {s}:{n}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{totalStock(p)}</td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => startEdit(p)} style={{ ...smallBtn, background: "#fff", border: "1px solid var(--bq-line)", color: "var(--bq-ink)" }}>Sửa</button>
                      <button onClick={() => remove(p.code)} style={{ ...smallBtn, background: "#fff", border: "1px solid #f0c4c4", color: "#e05252" }}>Xoá</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal title={editingCode ? `Sửa ${editingCode}` : "Thêm sản phẩm"} onClose={() => setForm(null)}>
          <Field label="Mã sản phẩm">
            <input value={form.code} disabled={!!editingCode}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} style={inp} />
          </Field>
          <Field label="Tên">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
          </Field>
          <Field label="Nhóm">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inp}>
              {["Giày Nữ", "Giày Nam", "Trẻ Em"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Giá lẻ">
              <input type="number" value={form.retail} onChange={(e) => setForm({ ...form, retail: +e.target.value })} style={inp} />
            </Field>
            <Field label="Giá sỉ">
              <input type="number" value={form.wholesale} onChange={(e) => setForm({ ...form, wholesale: +e.target.value })} style={inp} />
            </Field>
          </div>
          <Field label="Tồn theo size (vd: 39:50, 40:80)">
            <input value={form.sizesText} onChange={(e) => setForm({ ...form, sizesText: e.target.value })} style={inp} />
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => setForm(null)} style={{ ...smallBtn, background: "#fff", border: "1px solid var(--bq-line)", color: "var(--bq-ink)", padding: "10px 18px" }}>Huỷ</button>
            <button disabled={busy || !form.code || !form.name} onClick={save}
              style={{ ...smallBtn, background: "var(--bq-orange)", color: "#fff", padding: "10px 18px" }}>
              {busy ? "Đang lưu…" : "Lưu"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--bq-line)",
  fontSize: 14, marginTop: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12, flex: 1 }}>
      <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16,
        padding: "22px 24px", width: 460, maxWidth: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

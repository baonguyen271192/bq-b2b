"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, MapPin, Pencil, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";

type Addr = { id: string; name: string; phone: string; tag: string; def: boolean; address: string };

const SEED: Addr[] = [
  { id: "a1", name: "Nguyễn Văn Minh", phone: "0901 234 567", tag: "Kho hàng", def: true, address: "Kho tổng đại lý: 123 Nguyễn Trãi, P.7, Q.5, TP.HCM" },
  { id: "a2", name: "Trần Thị Lan", phone: "0913 999 888", tag: "Cửa hàng", def: false, address: "Cửa hàng Q.1: 45 Lê Lợi, P.Bến Nghé, Q.1, TP.HCM" },
  { id: "a3", name: "Lê Văn Hùng", phone: "0905 777 666", tag: "Chi nhánh", def: false, address: "Chi nhánh Bình Tân: 89 Tên Lửa, P.An Lạc, Q.Bình Tân, TP.HCM" },
];
const KEY = "bq_addresses";
const TAGS = ["Kho hàng", "Cửa hàng", "Chi nhánh"];
const empty = (): Addr => ({ id: "", name: "", phone: "", tag: "Cửa hàng", def: false, address: "" });

export default function AddressesPage() {
  const [list, setList] = useState<Addr[]>(SEED);
  const [selected, setSelected] = useState("a1");
  const [editing, setEditing] = useState<Addr | null>(null); // null = đóng form
  const [confirmDel, setConfirmDel] = useState<Addr | null>(null);

  // Nạp từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const l: Addr[] = JSON.parse(raw); setList(l); setSelected(l.find((a) => a.def)?.id || l[0]?.id || ""); }
    } catch {}
  }, []);
  const persist = (l: Addr[]) => { setList(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };

  const setDefault = (id: string) => { setSelected(id); persist(list.map((a) => ({ ...a, def: a.id === id }))); };
  const remove = (a: Addr) => {
    const l = list.filter((x) => x.id !== a.id);
    if (a.def && l[0]) l[0].def = true;
    persist(l); if (selected === a.id) setSelected(l.find((x) => x.def)?.id || l[0]?.id || "");
    setConfirmDel(null);
  };
  const save = (a: Addr) => {
    if (!a.name.trim() || !a.address.trim()) return;
    if (a.id) persist(list.map((x) => (x.id === a.id ? a : x)));
    else persist([...list, { ...a, id: "a" + (list.length + 1) + Date.now().toString().slice(-4) }]);
    setEditing(null);
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", gap: 8,
        position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--bq-line)" }}>
        <Link href="/profile" style={{ color: "var(--bq-orange)", display: "flex" }}><ChevronLeft size={22} /></Link>
        <span className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>Sổ địa chỉ đại lý</span>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: "var(--bq-muted)", lineHeight: 1.5 }}>
          Lưu nhiều địa chỉ kho / chi nhánh của đại lý để đặt hàng thuận tiện. BQ giao tới địa chỉ được chọn.
        </div>
        {list.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--bq-muted)", fontSize: 14 }}>Chưa có địa chỉ nào. Thêm địa chỉ mới bên dưới.</div>}
        {list.map((a) => {
          const on = selected === a.id;
          return (
            <div key={a.id} className="card" style={{ padding: 14, border: on ? "1.5px solid var(--bq-orange)" : "1px solid var(--bq-line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <MapPin size={16} color="var(--bq-orange)" />
                <b style={{ fontSize: 15 }}>{a.name}</b>
                <span style={{ color: "var(--bq-muted)" }}>|</span>
                <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{a.phone}</span>
                {a.def && <span style={{ background: "var(--bq-orange-soft)", color: "var(--bq-orange)", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>Mặc định</span>}
                <span style={{ background: "var(--bq-bg)", color: "var(--bq-muted)", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>{a.tag}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--bq-ink)", lineHeight: 1.5, marginBottom: 10 }}>{a.address}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--bq-line)", paddingTop: 10 }}>
                <button onClick={() => setDefault(a.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, color: on ? "var(--bq-orange)" : "var(--bq-muted)" }}>
                  {on ? <CheckCircle2 size={16} /> : <Circle size={16} />} {on ? "Địa chỉ nhận hàng" : "Chọn địa chỉ này"}
                </button>
                <div style={{ display: "flex", gap: 14 }}>
                  <button onClick={() => setEditing(a)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--bq-muted)" }}><Pencil size={14} /> Sửa</button>
                  <button onClick={() => setConfirmDel(a)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--bq-red)" }}><Trash2 size={14} /> Xóa</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid var(--bq-line)", padding: "12px 16px 20px" }}>
        <button onClick={() => setEditing(empty())} className="font-head" style={{ width: "100%", height: 48, borderRadius: 12, border: "none",
          background: "var(--bq-orange)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Plus size={20} /> Thêm địa chỉ mới
        </button>
      </div>

      {/* Form thêm/sửa */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 28px" }}>
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 16px" }} />
            <div className="font-head" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{editing.id ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</div>
            <Field label="Người nhận" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="VD: Nguyễn Văn A" />
            <Field label="Số điện thoại" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} placeholder="09xx xxx xxx" />
            <Field label="Địa chỉ" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} placeholder="Số nhà, đường, phường, quận, TP" />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "var(--bq-muted)", marginBottom: 6 }}>Loại địa điểm</div>
              <div style={{ display: "flex", gap: 8 }}>
                {TAGS.map((t) => (
                  <button key={t} onClick={() => setEditing({ ...editing, tag: t })}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, cursor: "pointer",
                      border: `1px solid ${editing.tag === t ? "var(--bq-orange)" : "var(--bq-line)"}`,
                      background: editing.tag === t ? "var(--bq-orange-soft)" : "#fff", color: editing.tag === t ? "var(--bq-orange)" : "var(--bq-ink)", fontWeight: editing.tag === t ? 700 : 500 }}>{t}</button>
                ))}
              </div>
            </div>
            <button onClick={() => save(editing)} className="font-head" disabled={!editing.name.trim() || !editing.address.trim()}
              style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: (!editing.name.trim() || !editing.address.trim()) ? "#f0b79f" : "var(--bq-orange)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              {editing.id ? "Lưu thay đổi" : "Thêm địa chỉ"}
            </button>
          </div>
        </div>
      )}

      {/* Xác nhận xóa */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div className="font-head" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Xóa địa chỉ?</div>
            <div style={{ fontSize: 13, color: "var(--bq-muted)", marginBottom: 18 }}>{confirmDel.name} — {confirmDel.address}</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDel(null)}>Không</button>
              <button onClick={() => remove(confirmDel)} className="font-head" style={{ flex: 1, height: 46, borderRadius: 12, border: "none", background: "var(--bq-red)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: "var(--bq-muted)", marginBottom: 6 }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1px solid var(--bq-line)", borderRadius: 10, padding: "11px 12px", fontSize: 14, outline: "none", fontFamily: "var(--font-geist)" }} />
    </div>
  );
}

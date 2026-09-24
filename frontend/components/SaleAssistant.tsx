"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Bot, Smartphone, Monitor, AlertTriangle } from "lucide-react";
import { Mascot } from "page-mascot";
import { api, SaleOrderCard } from "@/lib/api";

type Msg = { role: "user" | "bot"; text: string; chips?: string[]; orders?: SaleOrderCard[] };

const GREETING: Msg = {
  role: "bot",
  text: "Chào bạn 👋 Mình là **Trợ lý Sale BQ**. Mình nắm dữ liệu toàn hệ thống — hỏi mình về doanh số, công nợ, đơn hàng, hoặc nhờ **soạn tin nhắn** cho đại lý.",
  chips: ["Tóm tắt tình hình kinh doanh", "Đại lý nào nợ nhiều nhất?", "Đơn nào cần duyệt?", "Soạn tin nhắc công nợ cho đại lý nợ nhiều nhất"],
};

const MASCOT_BOX = 84;   // kích thước mascot (px) — dùng để giới hạn không kéo ra ngoài màn hình

export default function SaleAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Kéo-thả mascot: pos=null nghĩa là đang ở góc phải-dưới mặc định; khi kéo thì chuyển
  // sang toạ độ left/top tuyệt đối. Phân biệt KÉO vs BẤM: chỉ coi là kéo khi con trỏ dịch
  // quá ngưỡng — bấm tại chỗ vẫn mở chat, kéo thì di chuyển và KHÔNG mở chat.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: e.clientX - rect.left, oy: e.clientY - rect.top, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    if (d.moved) {
      const left = Math.min(window.innerWidth - MASCOT_BOX, Math.max(0, e.clientX - d.ox));
      const top = Math.min(window.innerHeight - MASCOT_BOX, Math.max(0, e.clientY - d.oy));
      setPos({ left, top });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    draggedRef.current = !!dragRef.current?.moved;   // nhớ vừa KÉO hay chỉ BẤM để onClick xử lý
    dragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await api.saleAssistant(text);
      setMsgs((m) => [...m, { role: "bot", text: r.answer, chips: r.chips, orders: r.orders }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Xin lỗi, mình chưa lấy được dữ liệu. Thử lại nhé." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      {/* Nút mở trợ lý = mascot (thay cho icon Bot + chữ "Trợ lý AI"). Mascot tự là 1
          <button> (nhìn theo con trỏ, boop khi bấm); bọc div để: bấm = MỞ chat, kéo = di chuyển. */}
      {!open && (
        <div title="Trợ lý AI — kéo để di chuyển"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          onClick={() => { if (draggedRef.current) { draggedRef.current = false; return; } setOpen(true); }}
          style={{ position: "fixed", zIndex: 60, cursor: "grab", touchAction: "none", userSelect: "none",
            ...(pos ? { left: pos.left, top: pos.top } : { bottom: 20, right: 20 }) }}>
          <Mascot directions="/mascots/ballerina-directions-v2.webp"
            reactions="/mascots/ballerina-reactions.webp" size={MASCOT_BOX} label="Trợ lý AI" />
        </div>
      )}

      {open && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 70, width: 420, maxWidth: "calc(100vw - 32px)",
          height: 620, maxHeight: "calc(100vh - 48px)", background: "#fff", borderRadius: 16, overflow: "hidden",
          display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,.24)", border: "1px solid var(--bq-line)" }}>
          <div style={{ background: "var(--bq-orange)", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={20} />
              <div>
                <div className="font-head" style={{ fontWeight: 800, fontSize: 16 }}>Trợ lý Sale BQ</div>
                <div style={{ fontSize: 11, opacity: .9 }}>Trợ lý AI · dữ liệu toàn hệ thống</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><X size={22} /></button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#f8fafc" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
                  background: m.role === "user" ? "var(--bq-orange)" : "#fff", color: m.role === "user" ? "#fff" : "var(--bq-ink)",
                  border: m.role === "user" ? "none" : "1px solid var(--bq-line)",
                  borderBottomRightRadius: m.role === "user" ? 4 : 14, borderBottomLeftRadius: m.role === "bot" ? 4 : 14 }}
                  dangerouslySetInnerHTML={{ __html: mdBold(m.text) }} />
                {m.orders && m.orders.length > 0 && (
                  <div style={{ width: "92%", display: "flex", flexDirection: "column", gap: 8 }}>
                    {m.orders.map((o) => <OrderCard key={o.id} o={o} />)}
                  </div>
                )}
                {m.chips && m.chips.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.chips.map((c) => (
                      <button key={c} onClick={() => send(c)} disabled={busy}
                        style={{ border: "1px solid var(--bq-orange)", background: "#fff", color: "var(--bq-orange)",
                          borderRadius: 16, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}>{c}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div style={{ fontSize: 13, color: "var(--bq-muted)" }}>Đang soạn trả lời…</div>}
            <div ref={endRef} />
          </div>

          <div style={{ background: "#fff", borderTop: "1px solid var(--bq-line)", padding: "10px 12px", display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Hỏi về doanh số, công nợ, hoặc nhờ soạn tin…"
              style={{ flex: 1, border: "1px solid var(--bq-line)", borderRadius: 22, padding: "11px 16px", fontSize: 14, outline: "none" }} />
            <button onClick={() => send(input)} disabled={busy || !input.trim()}
              style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
                background: input.trim() ? "var(--bq-orange)" : "#f0b79f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={19} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function mdBold(s: string): string {
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

// Màu badge theo trạng thái (đồng bộ với StatusBadge của admin).
function statusStyle(s: string): { bg: string; fg: string } {
  const t = s.toLowerCase();
  if (t.includes("duyệt")) return { bg: "#fff4e0", fg: "#b7791f" };
  if (t.includes("hoàn tất") || t.includes("đã nhận") || t.includes("đã xác nhận")) return { bg: "#e7f5ec", fg: "#2e9e5b" };
  if (t.includes("từ chối") || t.includes("huỷ") || t.includes("hủy")) return { bg: "#fdeaea", fg: "#e05252" };
  if (t.includes("giao") || t.includes("đóng gói") || t.includes("bàn giao")) return { bg: "#e8f0fe", fg: "#3b6fd4" };
  return { bg: "#eef2f7", fg: "#5b6472" };
}

function ChannelIcon({ c }: { c: string }) {
  const size = 13, color = "var(--bq-muted)";
  if (c === "App") return <Smartphone size={size} color={color} />;
  if (c === "Web") return <Monitor size={size} color={color} />;
  return <Bot size={size} color={color} />;
}

function OrderCard({ o }: { o: SaleOrderCard }) {
  const st = statusStyle(o.status);
  return (
    <div style={{ border: "1px solid var(--bq-line)", borderRadius: 12, background: "#fff", padding: "11px 13px",
      display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 13.5 }}>{o.id}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
          padding: "3px 9px", borderRadius: 20, background: st.bg, color: st.fg, whiteSpace: "nowrap" }}>
          {o.over_limit && <AlertTriangle size={11} />}{o.status}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--bq-ink)" }}>{o.who}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--bq-muted)" }}>
        <ChannelIcon c={o.channel} /> {o.channel} · {o.created_at}
      </div>
      {o.product && <div style={{ fontSize: 12.5 }}>{o.product}</div>}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8,
        borderTop: "1px dashed var(--bq-line)", paddingTop: 6 }}>
        <span style={{ fontSize: 12, color: "var(--bq-muted)" }}>{o.pairs} đôi</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--bq-orange)" }}>{o.amount}</span>
      </div>
    </div>
  );
}

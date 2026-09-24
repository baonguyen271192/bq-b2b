"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, X, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { api, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";

type DraftLine = { code: string; name: string; image: string; unit_price: number; sizes: Record<string, number> };
type OrderAction = { type: "create_order"; lines: DraftLine[]; subtotal: number; total_pairs: number };
type Card = { code: string; name: string; image: string; images?: string[]; price: number; sizes: Record<string, number> };
type Msg = { role: "user" | "bot"; text: string; chips?: string[]; action?: OrderAction; cards?: Card[]; done?: string };
const HIDE_ON = ["/cart", "/checkout", "/review", "/order-success"]; // ẩn ở luồng thanh toán

const GREETING: Msg = {
  role: "bot",
  text: "Chào bạn 👋 Mình là trợ lý đại lý BQ. Bạn có thể hỏi công nợ/đơn hàng, hoặc **đặt hàng trực tiếp** — mình dựng đơn, bạn chỉ cần xác nhận.",
  chips: ["Đặt Solara size 36-38, mỗi size 10", "Tổng công nợ hiện tại", "Đơn nào đang giao?", "Sản phẩm nào còn hàng?"],
};

export default function Assistant() {
  const { dealer } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; idx: number } | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  // Nút nổi thu nhỏ/mờ đi khi đang cuộn danh sách (đơn hàng, sản phẩm…) để không đè lên
  // giá/trạng thái đang đọc dở; hiện rõ lại ngay khi dừng cuộn.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setScrolling(false), 350);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, []);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await api.assistant(dealer, text) as { answer: string; chips?: string[]; action?: OrderAction; cards?: Card[] };
      setMsgs((m) => [...m, { role: "bot", text: r.answer, chips: r.chips, action: r.action, cards: r.cards }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Xin lỗi, mình chưa lấy được dữ liệu. Thử lại nhé." }]);
    } finally { setBusy(false); }
  };

  // Xác nhận đơn nháp → tạo đơn thật.
  const confirmOrder = async (idx: number, a: OrderAction) => {
    if (placing) return;
    setPlacing(true);
    try {
      const order = await api.createOrder({
        dealer_code: dealer,
        lines: a.lines.map((l) => ({ code: l.code, sizes: l.sizes })),
        payment: "Công nợ 30 ngày", channel: "ai-chat",
      });
      // đánh dấu đơn nháp này đã đặt → khoá nút
      setMsgs((m) => m.map((x, i) => (i === idx ? { ...x, action: undefined, done: order.id } : x)));
      setMsgs((m) => [...m, { role: "bot", text: `Đã tạo đơn **${order.id}** ✓ Trạng thái: ${order.status}. Bạn vào xem chi tiết & theo dõi nhé.`, chips: [] }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "bot", text: "Không tạo được đơn (có thể vượt hạn mức). Bạn kiểm tra công nợ giúp mình nhé." }]);
    } finally { setPlacing(false); }
  };

  return (
    <>
      {/* Nút nổi */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Trợ lý BQ"
          style={{ position: "fixed", bottom: 84, right: "max(16px, calc(50% - 215px + 16px))", zIndex: 60,
            width: 54, height: 54, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "var(--bq-orange)", color: "#fff", boxShadow: "0 6px 18px rgba(232,84,30,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            // Đang cuộn danh sách (đơn hàng, sản phẩm…) → thu nhỏ + mờ đi và không bắt tap
            // nhầm, tránh đè lên giá/trạng thái đang đọc dở. Hiện rõ lại ngay khi dừng cuộn.
            opacity: scrolling ? 0.4 : 1, transform: scrolling ? "scale(0.8)" : "scale(1)",
            pointerEvents: scrolling ? "none" : "auto",
            transition: "opacity 200ms ease, transform 200ms ease" }}>
          <MessageCircle size={26} />
        </button>
      )}

      {/* Cửa sổ chat */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
          <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "82vh", background: "#f8fafc",
            borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "var(--bq-orange)", color: "#fff", padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={20} />
                <div>
                  <div className="font-head" style={{ fontWeight: 800, fontSize: 16 }}>Trợ lý đại lý BQ</div>
                  <div style={{ fontSize: 11, opacity: .9 }}>Trả lời từ dữ liệu đại lý của bạn</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><X size={22} /></button>
            </div>

            {/* Nội dung */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                  <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
                    background: m.role === "user" ? "var(--bq-orange)" : "#fff", color: m.role === "user" ? "#fff" : "var(--bq-ink)",
                    border: m.role === "user" ? "none" : "1px solid var(--bq-line)",
                    borderBottomRightRadius: m.role === "user" ? 4 : 14, borderBottomLeftRadius: m.role === "bot" ? 4 : 14 }}
                    dangerouslySetInnerHTML={{ __html: mdBold(m.text) }} />

                  {/* Card sản phẩm (tồn kho / danh mục) */}
                  {m.cards && m.cards.length > 0 && (
                    <div style={{ width: "92%", display: "flex", flexDirection: "column", gap: 8 }}>
                      {m.cards.map((c) => {
                        const inStock = Object.entries(c.sizes).filter(([, n]) => n > 0);
                        const out = Object.entries(c.sizes).filter(([, n]) => n === 0).map(([s]) => s);
                        return (
                          <div key={c.code}
                            style={{ background: "#fff", border: "1px solid var(--bq-line)", borderRadius: 12, padding: 10, display: "flex", gap: 10 }}>
                            {/* Bấm ảnh → mở gallery xem ảnh chi tiết ngay trong chat */}
                            <button onClick={() => setLightbox({ images: c.images && c.images.length ? c.images : [c.image], idx: 0 })}
                              title="Bấm để xem ảnh"
                              style={{ padding: 0, border: "none", background: "none", cursor: "zoom-in", flexShrink: 0, lineHeight: 0 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.image} alt={c.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                                <b style={{ color: "var(--bq-orange)", fontSize: 13, whiteSpace: "nowrap" }}>{vnd(c.price)}</b>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                                {inStock.map(([s, n]) => (
                                  <span key={s} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "var(--bq-green-soft)", color: "var(--bq-green)", fontWeight: 600 }}>{s}: {n}</span>
                                ))}
                                {out.map((s) => (
                                  <span key={s} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "#f1f5f9", color: "#94a3b8", textDecoration: "line-through" }}>{s}</span>
                                ))}
                              </div>
                              {/* Điền SẴN vào ô nhập (kèm gợi ý số lượng) để đại lý REVIEW/SỬA
                                  đúng size + số lượng họ cần rồi mới bấm gửi — không tự chốt đơn
                                  với size/số lượng mặc định như trước (dễ ra đơn sai ý). */}
                              <button onClick={() => {
                                  setInput(`đặt ${c.name} size ${inStock.map(([s]) => s).join(",")}, mỗi size 10 đôi`);
                                  requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
                                }}
                                style={{ marginTop: 8, border: "1px solid var(--bq-orange)", background: "#fff", color: "var(--bq-orange)",
                                  borderRadius: 8, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Đặt mẫu này</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Đơn nháp — xem & xác nhận */}
                  {m.action && (
                    <div style={{ width: "92%", background: "#fff", border: "1.5px solid var(--bq-orange)", borderRadius: 14, padding: 12 }}>
                      {m.action.lines.map((l) => (
                        <div key={l.code} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.image} alt={l.name} style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{l.name}</div>
                            <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>
                              {Object.entries(l.sizes).map(([s, q]) => `size ${s}×${q}`).join(", ")}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--bq-line)", paddingTop: 8, fontSize: 13 }}>
                        <span style={{ color: "var(--bq-muted)" }}>{m.action.total_pairs} đôi</span>
                        <b style={{ color: "var(--bq-orange)" }}>{vnd(m.action.subtotal)}</b>
                      </div>
                      <button onClick={() => confirmOrder(i, m.action!)} disabled={placing} className="font-head"
                        style={{ width: "100%", marginTop: 10, height: 42, borderRadius: 10, border: "none",
                          background: "var(--bq-orange)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                        {placing ? "Đang tạo…" : "Xác nhận tạo đơn"}
                      </button>
                    </div>
                  )}

                  {/* Đơn đã tạo → link xem */}
                  {m.done && (
                    <button onClick={() => { setOpen(false); router.push(`/orders/${m.done}`); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--bq-green)", background: "var(--bq-green-soft)",
                        color: "var(--bq-green)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      <CheckCircle2 size={16} /> Xem đơn {m.done}
                    </button>
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

            {/* Ô nhập */}
            <div style={{ background: "#fff", borderTop: "1px solid var(--bq-line)", padding: "10px 12px 20px", display: "flex", gap: 8 }}>
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Hỏi về công nợ, đơn hàng, tồn kho…"
                style={{ flex: 1, border: "1px solid var(--bq-line)", borderRadius: 22, padding: "11px 16px", fontSize: 14, outline: "none", fontFamily: "var(--font-geist)" }} />
              <button onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Gửi"
                style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
                  background: input.trim() ? "var(--bq-orange)" : "#f0b79f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send size={19} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox xem ảnh sản phẩm (gallery) — bấm ảnh trên thẻ để mở */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.9)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button onClick={() => setLightbox(null)} aria-label="Đóng"
            style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%",
              border: "none", background: "rgba(255,255,255,.15)", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}><X size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.images[lightbox.idx]} alt="Ảnh sản phẩm" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "92%", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }} />
          {lightbox.images.length > 1 && (
            <>
              <button aria-label="Ảnh trước"
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && { ...l, idx: (l.idx - 1 + l.images.length) % l.images.length }); }}
                style={lbNav("left")}>‹</button>
              <button aria-label="Ảnh sau"
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && { ...l, idx: (l.idx + 1) % l.images.length }); }}
                style={lbNav("right")}>›</button>
              <div style={{ position: "absolute", bottom: 24, color: "#fff", background: "rgba(0,0,0,.5)",
                padding: "4px 12px", borderRadius: 20, fontSize: 13 }}>{lightbox.idx + 1}/{lightbox.images.length}</div>
            </>
          )}
        </div>
      )}
    </>
  );
}

const lbNav = (side: "left" | "right"): CSSProperties => ({
  position: "absolute", top: "50%", transform: "translateY(-50%)", [side]: 12,
  width: 46, height: 46, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.15)",
  color: "#fff", fontSize: 30, lineHeight: 1, cursor: "pointer",
});

// Chỉ hỗ trợ **đậm** trong câu trả lời (an toàn, không render HTML khác).
function mdBold(s: string): string {
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

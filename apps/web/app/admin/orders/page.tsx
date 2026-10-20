"use client";
import { useCallback, useEffect, useState } from "react";
import { api, Order, RetailOrder, vnd, nextActionLabel, retailNextActionLabel } from "@/lib/api";
import { Store, MessageCircle, ChevronRight, X, Check } from "lucide-react";
import { PageHeader, Tile, StatusBadge, SearchBox, card, th, td, ChannelBadge, Modal } from "../ui";

type Tab = "wholesale" | "retail";

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("wholesale");
  const [orders, setOrders] = useState<Order[]>([]);
  const [retail, setRetail] = useState<RetailOrder[]>([]);
  const [retailErr, setRetailErr] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<
    { kind: "wholesale"; o: Order } | { kind: "retail"; o: RetailOrder } | null
  >(null);
  // Ảnh sản phẩm cho modal chi tiết — đơn không mang sẵn ảnh, tra theo mã từ danh mục.
  const [wholesaleImg, setWholesaleImg] = useState<Record<string, string>>({});
  const [retailImg, setRetailImg] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.orders().then(setOrders).catch(() => {});
    api.retailOrders().then((r) => { setRetail(r); setRetailErr(false); }).catch(() => setRetailErr(true));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    api.adminProducts().then((ps) => {
      setWholesaleImg(Object.fromEntries(ps.map((p) => [p.code, p.image])));
    }).catch(() => {});
    api.retailProductImages().then(setRetailImg).catch(() => {});
  }, []);

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    try { await fn(); load(); } finally { setBusy(null); }
  };

  const kw = q.trim().toLowerCase();
  const wholesaleRows = orders.filter((o) => !kw ||
    [o.id, o.dealer_name, o.dealer_code, o.items[0]?.name, o.status]
      .some((f) => (f || "").toLowerCase().includes(kw)));
  const retailRows = retail.filter((o) => !kw ||
    [o.id, o.customer_name, o.customer_phone, o.items[0]?.name, o.status]
      .some((f) => (f || "").toLowerCase().includes(kw)));

  const active = (status: string) => !/(huỷ|hủy|từ chối)/i.test(status);

  return (
    <div>
      <PageHeader title="Đơn hàng"
        subtitle="Đơn sỉ (đại lý) và đơn lẻ (khách qua bot Facebook/Zalo) — cùng 1 nơi quản lý" />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["wholesale", "Đơn sỉ (đại lý)", Store], ["retail", "Đơn lẻ (Facebook/Zalo)", MessageCircle]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            border: "1px solid var(--bq-line)", borderRadius: 20, padding: "8px 18px",
            cursor: "pointer", fontSize: 14, fontWeight: 600,
            background: tab === k ? "var(--bq-orange)" : "#fff",
            color: tab === k ? "#fff" : "var(--bq-ink)",
          }}>
            <Icon size={16} strokeWidth={2} aria-hidden />{label}
          </button>
        ))}
      </div>

      {tab === "wholesale"
        ? <WholesaleTab rows={wholesaleRows} q={q} setQ={setQ} busy={busy}
            onApprove={(id, ok) => act(() => api.approve(id, ok), id)}
            onAdvance={(id) => act(() => api.advance(id), id)}
            onCancel={(id) => act(() => api.cancel(id), id)}
            onOpen={(o) => setDetail({ kind: "wholesale", o })} />
        : <RetailTab rows={retailRows} q={q} setQ={setQ} busy={busy} err={retailErr}
            onAdvance={(id) => act(() => api.retailAdvance(id), id)}
            onCancel={(id) => act(() => api.retailCancel(id), id)}
            onOpen={(o) => setDetail({ kind: "retail", o })} />}

      {detail?.kind === "wholesale" && (
        <WholesaleDetailModal o={detail.o} images={wholesaleImg} onClose={() => setDetail(null)} />
      )}
      {detail?.kind === "retail" && (
        <RetailDetailModal o={detail.o} images={retailImg} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function WholesaleTab({ rows, q, setQ, busy, onApprove, onAdvance, onCancel, onOpen }: {
  rows: Order[]; q: string; setQ: (v: string) => void; busy: string | null;
  onApprove: (id: string, ok: boolean) => void; onAdvance: (id: string) => void; onCancel: (id: string) => void;
  onOpen: (o: Order) => void;
}) {
  const active = (o: Order) => !/(huỷ|hủy|từ chối)/i.test(o.status);
  const revenue = rows.filter(active).reduce((s, o) => s + o.subtotal, 0);
  const pendingApproval = rows.filter((o) => o.status.includes("duyệt")).length;
  const done = rows.filter((o) => /(đã nhận)/i.test(o.status)).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        <Tile label="Số đơn" value={String(rows.length)} />
        <Tile label="Chờ duyệt (vượt hạn mức)" value={String(pendingApproval)}
          accent={pendingApproval > 0 ? "#b7791f" : undefined} />
        <Tile label="Tổng giá trị đơn" value={vnd(revenue)} />
        <Tile label="Hoàn tất" value={String(done)} accent={done > 0 ? "#2e9e5b" : undefined} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Tìm mã đơn, đại lý, sản phẩm…" />
        <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{rows.length} đơn</span>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafbfc", textAlign: "left", color: "var(--bq-muted)", fontSize: 13 }}>
                <th style={th}>Mã đơn</th>
                <th style={th}>Đại lý</th>
                <th style={th}>Kênh</th>
                <th style={th}>Sản phẩm</th>
                <th style={{ ...th, textAlign: "right" }}>Giá trị</th>
                <th style={th}>Trạng thái</th>
                <th style={{ ...th, textAlign: "center" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "var(--bq-muted)" }}>
                  Chưa có đơn nào.</td></tr>
              )}
              {rows.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--bq-line)" }}>
                  <td style={td}><b>{o.id}</b>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{o.created_at}</div></td>
                  <td style={td}>
                    {o.dealer_name}
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{o.dealer_code}</div>
                  </td>
                  <td style={td}><ChannelBadge channel={o.channel} /></td>
                  <td style={{ ...td, cursor: "pointer" }} onClick={() => onOpen(o)} title="Xem chi tiết đơn">
                    {o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>
                      {o.items.reduce((n, it) => n + (Number(it.qty_total) || 0), 0)} đôi</div>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "var(--bq-orange)" }}>
                    {vnd(o.subtotal)}</td>
                  <td style={td}><StatusBadge status={o.status} /></td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <WholesaleActions o={o} busy={busy === o.id}
                      onApprove={(ok) => onApprove(o.id, ok)}
                      onAdvance={() => onAdvance(o.id)}
                      onCancel={() => onCancel(o.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "var(--bq-muted)" }}>
        💡 Đơn từ App/Web của đại lý và trợ lý AI. Bảng tự làm mới mỗi 3 giây.
      </div>
    </div>
  );
}

function WholesaleActions({ o, busy, onApprove, onAdvance, onCancel }: {
  o: Order; busy: boolean;
  onApprove: (ok: boolean) => void; onAdvance: () => void; onCancel: () => void;
}) {
  if (o.status.includes("duyệt")) {
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        <button className="admin-btn" disabled={busy} onClick={() => onApprove(true)}
          style={{ background: "#2e9e5b", color: "#fff" }}><Check size={14} /> Duyệt</button>
        <button className="admin-btn-outline" disabled={busy} onClick={() => onApprove(false)}>Từ chối</button>
      </div>
    );
  }
  const label = nextActionLabel(o.status);
  if (label) {
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
        <button className="admin-btn" disabled={busy} onClick={onAdvance}
          style={{ background: "var(--bq-orange)", color: "#fff" }}>{label} <ChevronRight size={14} style={{ marginLeft: -2 }} /></button>
        <button className="admin-icon-btn" disabled={busy} onClick={onCancel} title="Huỷ đơn"><X size={15} /></button>
      </div>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: "#2e9e5b" }}>
      <Check size={14} /> Hoàn tất
    </span>
  );
}

function RetailTab({ rows, q, setQ, busy, err, onAdvance, onCancel, onOpen }: {
  rows: RetailOrder[]; q: string; setQ: (v: string) => void; busy: string | null; err: boolean;
  onAdvance: (id: string) => void; onCancel: (id: string) => void; onOpen: (o: RetailOrder) => void;
}) {
  const active = (o: RetailOrder) => !/(huỷ|hủy|từ chối)/i.test(o.status);
  const revenue = rows.filter(active).reduce((s, o) => s + o.subtotal, 0);
  const pending = rows.filter((o) => o.status.includes("Chờ xác nhận")).length;
  const done = rows.filter((o) => o.status.includes("Hoàn tất")).length;
  // Khách bấm "than phiền" trong chat với bot Facebook — đánh dấu bên Commerce, phải
  // hiện lại ở đây để BQ không bỏ sót (trước đây API trả field này nhưng UI chưa đọc).
  const flagged = rows.filter((o) => !!o.flagged);

  if (err) {
    return (
      <div style={{ ...card, padding: 24, color: "var(--bq-muted)", fontSize: 14 }}>
        ⚠️ Không kết nối được tới service Commerce (bot đặt đơn) — kiểm tra service đó
        có đang chạy không. Đơn sỉ ở tab bên cạnh vẫn hoạt động bình thường.
      </div>
    );
  }

  return (
    <div>
      {flagged.length > 0 && (
        <div style={{ background: "#fdeaea", border: "1px solid #f3b7b7", color: "#b83232",
          borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13.5, fontWeight: 600 }}>
          ⚠️ {flagged.length} đơn khách đang than phiền, cần kiểm tra
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        <Tile label="Số đơn" value={String(rows.length)} />
        <Tile label="Chờ xác nhận" value={String(pending)}
          accent={pending > 0 ? "#b7791f" : undefined} />
        <Tile label="Tổng giá trị đơn" value={vnd(revenue)} />
        <Tile label="Hoàn tất" value={String(done)} accent={done > 0 ? "#2e9e5b" : undefined} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Tìm mã đơn, tên/SĐT khách, sản phẩm…" />
        <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{rows.length} đơn</span>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#fafbfc", textAlign: "left", color: "var(--bq-muted)", fontSize: 13 }}>
                <th style={th}>Mã đơn</th>
                <th style={th}>Khách hàng</th>
                <th style={th}>Kênh</th>
                <th style={th}>Sản phẩm</th>
                <th style={{ ...th, textAlign: "right" }}>Giá trị</th>
                <th style={th}>Thanh toán</th>
                <th style={th}>Trạng thái</th>
                <th style={{ ...th, textAlign: "center" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: "center", color: "var(--bq-muted)" }}>
                  Chưa có đơn lẻ nào.</td></tr>
              )}
              {rows.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--bq-line)",
                  background: o.flagged ? "#fef4f4" : undefined }}>
                  <td style={td}>
                    {!!o.flagged && <span title={o.flag_note || "Khách than phiền"} style={{ marginRight: 4 }}>⚠️</span>}
                    <b>{o.id}</b>
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{o.created_at}</div>
                    {!!o.flagged && (
                      <div style={{ fontSize: 11, color: "#b83232", fontWeight: 600, marginTop: 3, maxWidth: 160 }}>
                        ⚠️ Cần xử lý{o.flag_note ? `: ${o.flag_note}` : ""}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    {o.customer_name}
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>{o.customer_phone}</div>
                  </td>
                  <td style={td}><ChannelBadge channel={o.channel} /></td>
                  <td style={{ ...td, cursor: "pointer" }} onClick={() => onOpen(o)} title="Xem chi tiết đơn">
                    {o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
                    <div style={{ fontSize: 12, color: "var(--bq-muted)" }}>
                      {o.items.reduce((n, it) => n + (Number(it.qty_total) || 0), 0)} đôi</div>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "var(--bq-orange)" }}>
                    {vnd(o.subtotal)}</td>
                  <td style={td}>{o.payment}</td>
                  <td style={td}>
                    <StatusBadge status={o.status} />
                    {o.customer_address && (
                      <div style={{ fontSize: 11, color: "var(--bq-muted)", marginTop: 3, maxWidth: 200 }}>
                        📍 {o.customer_address}</div>)}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <RetailActions o={o} busy={busy === o.id}
                      onAdvance={() => onAdvance(o.id)}
                      onCancel={() => onCancel(o.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "var(--bq-muted)" }}>
        💡 Đơn khách lẻ đặt qua bot Facebook/Zalo (service Commerce riêng) — COD, không công nợ.
        Bảng tự làm mới mỗi 3 giây.
      </div>
    </div>
  );
}

function RetailActions({ o, busy, onAdvance, onCancel }: {
  o: RetailOrder; busy: boolean; onAdvance: () => void; onCancel: () => void;
}) {
  const label = retailNextActionLabel(o.status);
  if (label) {
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
        <button className="admin-btn" disabled={busy} onClick={onAdvance}
          style={{ background: "var(--bq-orange)", color: "#fff" }}>{label} <ChevronRight size={14} style={{ marginLeft: -2 }} /></button>
        <button className="admin-icon-btn" disabled={busy} onClick={onCancel} title="Huỷ đơn"><X size={15} /></button>
      </div>
    );
  }
  if (/(huỷ|hủy)/i.test(o.status)) {
    return <span style={{ fontSize: 12.5, color: "var(--bq-muted)" }}>—</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: "#2e9e5b" }}>
      <Check size={14} /> Hoàn tất
    </span>
  );
}

// Dòng 1 sản phẩm trong modal chi tiết — dùng chung cho cả 2 loại đơn. Không giả định
// item luôn đủ field (đơn test/demo có thể thiếu sizes/unit_price) — luôn có fallback,
// tránh hiện NaN/undefined ra màn hình.
function DetailItemRow({ it, image }: { it: { code: string; name: string; sizes?: Record<string, number>;
  unit_price?: number; qty_total?: number; line_total?: number }; image?: string }) {
  const sizeText = it.sizes && Object.keys(it.sizes).length
    ? Object.entries(it.sizes).map(([sz, n]) => `${sz}:${n}`).join(", ")
    : "—";
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--bq-line)" }}>
      {image
        ? <img src={image} alt={it.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover",
            flexShrink: 0, background: "#f4f6f8" }} />
        : <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f4f6f8", flexShrink: 0 }} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.name}</div>
        <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 2 }}>
          Mã: {it.code} · Size: {sizeText} · {Number(it.qty_total) || 0} đôi
        </div>
        <div style={{ fontSize: 12.5, marginTop: 2 }}>
          {vnd(Number(it.unit_price) || 0)} × {Number(it.qty_total) || 0} = <b>{vnd(Number(it.line_total) || 0)}</b>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, padding: "5px 0" }}>
      <span style={{ color: "var(--bq-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function WholesaleDetailModal({ o, images, onClose }: { o: Order; images: Record<string, string>; onClose: () => void }) {
  return (
    <Modal title={`Đơn ${o.id}`} onClose={onClose}>
      <div style={{ marginBottom: 10 }}><StatusBadge status={o.status} /></div>
      <DetailRow label="Đại lý" value={`${o.dealer_name} (${o.dealer_code})`} />
      <DetailRow label="Kênh" value={<ChannelBadge channel={o.channel} />} />
      <DetailRow label="Ngày đặt" value={o.created_at} />
      <DetailRow label="Giao hàng" value={o.delivery || "—"} />
      <DetailRow label="Thanh toán" value={o.payment || "—"} />
      {o.approver && <DetailRow label="Duyệt bởi" value={`${o.approver}${o.approve_note ? ` — ${o.approve_note}` : ""}`} />}
      <div style={{ marginTop: 10, marginBottom: 6, fontWeight: 700, fontSize: 13.5 }}>Sản phẩm</div>
      {o.items.map((it, i) => <DetailItemRow key={i} it={it} image={images[it.code]} />)}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontSize: 15, fontWeight: 800 }}>
        <span>Tổng</span><span style={{ color: "var(--bq-orange)" }}>{vnd(o.subtotal)}</span>
      </div>
    </Modal>
  );
}

function RetailDetailModal({ o, images, onClose }: { o: RetailOrder; images: Record<string, string>; onClose: () => void }) {
  return (
    <Modal title={`Đơn ${o.id}`} onClose={onClose}>
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <StatusBadge status={o.status} />
        {!!o.flagged && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#b83232" }}>⚠️ Khách đang than phiền</span>
        )}
      </div>
      {!!o.flagged && o.flag_note && (
        <div style={{ background: "#fdeaea", border: "1px solid #f3b7b7", color: "#b83232",
          borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13 }}>
          {o.flag_note}
        </div>
      )}
      <DetailRow label="Khách hàng" value={`${o.customer_name} — ${o.customer_phone}`} />
      <DetailRow label="Kênh" value={<ChannelBadge channel={o.channel} />} />
      <DetailRow label="Ngày đặt" value={o.created_at} />
      <DetailRow label="Địa chỉ giao" value={o.customer_address || "—"} />
      <DetailRow label="Thanh toán" value={o.payment || "—"} />
      <div style={{ marginTop: 10, marginBottom: 6, fontWeight: 700, fontSize: 13.5 }}>Sản phẩm</div>
      {o.items.map((it, i) => <DetailItemRow key={i} it={it} image={images[it.code]} />)}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontSize: 15, fontWeight: 800 }}>
        <span>Tổng</span><span style={{ color: "var(--bq-orange)" }}>{vnd(o.subtotal)}</span>
      </div>
    </Modal>
  );
}

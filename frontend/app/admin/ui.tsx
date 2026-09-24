"use client";
import React from "react";
import { Search, Smartphone, Monitor, Bot, MessageCircle, MessageSquare, LucideIcon } from "lucide-react";

// ---- Style tokens dùng chung cho admin (inline-style, đồng bộ với dashboard cũ) ----
export const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,.05)",
  border: "1px solid var(--bq-line)",
};
export const th: React.CSSProperties = { padding: "12px 14px", fontWeight: 600 };
export const td: React.CSSProperties = { padding: "12px 14px", verticalAlign: "top" };
export const smallBtn: React.CSSProperties = {
  border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};

export function PageHeader({ title, subtitle, right }: {
  title: string; subtitle?: string; right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 22 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--bq-muted)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Tile({ label, value, accent, hint, icon }: {
  label: string; value: string; accent?: string; hint?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{ ...card, padding: "15px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--bq-muted)" }}>{label}</div>
        {icon && (
          <span style={{ display: "flex", width: 30, height: 30, borderRadius: 9, alignItems: "center",
            justifyContent: "center", background: (accent || "#94a3b8") + "1f", color: accent || "#64748b" }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: accent || "var(--bq-ink)" }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const base: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
  };
  let style = { ...base, background: "#eef2f7", color: "#5b6472" };
  if (s.includes("duyệt")) style = { ...base, background: "#fff4e0", color: "#b7791f" };
  else if (s.includes("hoàn tất") || s.includes("đã nhận") || s.includes("đã xác nhận"))
    style = { ...base, background: "#e7f5ec", color: "#2e9e5b" };
  else if (s.includes("từ chối") || s.includes("huỷ") || s.includes("hủy"))
    style = { ...base, background: "#fdeaea", color: "#e05252" };
  else if (s.includes("giao") || s.includes("đóng gói") || s.includes("bàn giao"))
    style = { ...base, background: "#e8f0fe", color: "#3b6fd4" };
  return <span style={style}>{status}</span>;
}

// Danh sách thanh ngang đơn giản (dùng cho top SP / theo kênh / theo trạng thái)
export function BarList({ rows, color = "var(--bq-orange)", fmt }: {
  rows: { label: string; value: number }[];
  color?: string;
  fmt?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.length === 0 && <div style={{ color: "var(--bq-muted)", fontSize: 13 }}>Chưa có dữ liệu.</div>}
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span>{r.label}</span>
            <b>{fmt ? fmt(r.value) : r.value}</b>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: "#eef2f7", overflow: "hidden" }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: "100%", background: color, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionCard({ title, children, style, icon, right }: {
  title: string; children: React.ReactNode; style?: React.CSSProperties;
  icon?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        {icon && <span style={{ display: "flex", color: "var(--bq-orange)" }}>{icon}</span>}
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      {/* Căn giữa dọc → card ít nội dung không bị dồn khoảng trắng xuống đáy */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="admin-search" style={{ position: "relative", flex: 1, maxWidth: 320 }}>
      <Search size={16} aria-hidden style={{ position: "absolute", left: 11, top: "50%",
        transform: "translateY(-50%)", color: "var(--bq-muted)", pointerEvents: "none" }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        aria-label={placeholder} style={{
          width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10,
          border: "1px solid var(--bq-line)", fontSize: 14, background: "#fff",
        }} />
    </div>
  );
}

// Nhãn kênh dạng chữ thuần (dùng cho biểu đồ / label chuỗi).
export const channelLabel = (c: string) =>
  c === "facebook" ? "Facebook"
  : c === "zalo_personal" ? "Zalo"
  : c === "zalo_oa" ? "Zalo OA"
  : c === "web" ? "Web"
  : c === "ai-chat" ? "AI Chat"
  : "App";

const CHANNEL_META: Record<string, { Icon: LucideIcon; color: string }> = {
  facebook: { Icon: MessageCircle, color: "#2563eb" },
  zalo_personal: { Icon: MessageSquare, color: "#0068ff" },
  zalo_oa: { Icon: MessageSquare, color: "#0068ff" },
  web: { Icon: Monitor, color: "#0f766e" },
  "ai-chat": { Icon: Bot, color: "#7c3aed" },
  app: { Icon: Smartphone, color: "#64748b" },
};

export const channelColor = (c: string) => (CHANNEL_META[c] || CHANNEL_META.app).color;

// Biểu đồ tròn (donut) — cho dữ liệu tỉ lệ ≤5 nhóm. SVG thuần, không thư viện.
export function Donut({ rows, size = 168, thickness = 26, unit = "đơn" }: {
  rows: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; unit?: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const segs = rows.filter((x) => x.value > 0).map((row, i) => {
    const len = C * (row.value / total);
    const el = (
      <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={row.color}
        strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
    );
    offset += len;
    return el;
  });
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
          {segs}
        </g>
        <text x="50%" y="46%" textAnchor="middle" fontSize={27} fontWeight={800} fill="var(--bq-ink)">{total}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize={11.5} fill="var(--bq-muted)">{unit}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 0 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: row.color, flexShrink: 0 }} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</span>
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{row.value}</b>
            <span style={{ color: "var(--bq-muted)", width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round((row.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Nhãn kênh có icon SVG (dùng trong bảng).
export function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] || CHANNEL_META.app;
  const { Icon } = meta;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <Icon size={15} strokeWidth={2} color={meta.color} aria-hidden />
      <span>{channelLabel(channel)}</span>
    </span>
  );
}

export const inp: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--bq-line)",
  fontSize: 14, marginTop: 4,
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12, flex: 1 }}>
      <span style={{ fontSize: 13, color: "var(--bq-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
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

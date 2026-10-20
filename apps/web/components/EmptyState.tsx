"use client";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

// Empty state chuẩn: icon trong vòng tròn nhạt + tiêu đề + gợi ý + nút (tuỳ chọn).
export default function EmptyState({
  Icon, title, subtitle, actionLabel, actionHref, compact,
}: {
  Icon: LucideIcon; title: string; subtitle?: string;
  actionLabel?: string; actionHref?: string; compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: compact ? "28px 20px" : "48px 24px" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bq-orange-soft)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={32} strokeWidth={1.8} color="var(--bq-orange)" />
      </div>
      <div className="font-head" style={{ fontSize: 16, fontWeight: 700, color: "var(--bq-ink)" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 13, color: "var(--bq-muted)", marginTop: 6, maxWidth: 260, lineHeight: 1.5 }}>{subtitle}</div>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-outline"
          style={{ display: "inline-flex", marginTop: 18, textDecoration: "none", padding: "10px 22px" }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

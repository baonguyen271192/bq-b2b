"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { api, Order, vnd } from "@/lib/api";

export default function OrderSuccess({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [o, setO] = useState<Order | null>(null);
  useEffect(() => { api.order(id).then(setO).catch(() => {}); }, [id]);

  const pairs = o?.items.reduce((n, i) => n + i.qty_total, 0) ?? 0;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", padding: "40px 16px 24px" }}>
      <div style={{ flex: 1 }}>
        {/* Check */}
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bq-green-soft)", color: "var(--bq-green)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "24px auto 20px" }}>
          <Check size={36} strokeWidth={3} />
        </div>
        <div className="font-head" style={{ textAlign: "center", fontSize: 22, fontWeight: 700, color: "var(--bq-orange)" }}>
          Gửi đơn hàng thành công!
        </div>
        <div style={{ textAlign: "center", fontSize: 14, color: "var(--bq-muted)", marginTop: 6 }}>
          Hệ thống đã nhận đơn đặt hàng của bạn.
        </div>

        {/* Card */}
        {o && (
          <div style={{ background: "var(--bq-bg)", borderRadius: 12, padding: 16, marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Mã đơn hàng B2B" value={o.id} bold />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={lbl}>Trạng thái đơn:</span>
              <span style={{ background: "var(--bq-amber-soft)", color: "var(--bq-amber)", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {o.status.replace(" (vượt hạn mức)", "")}
              </span>
            </div>
            <div style={{ height: 1, background: "var(--bq-line)" }} />
            <Row label="Giá trị thanh toán:" value={vnd(o.subtotal)} valueColor="var(--bq-orange)" bold />
            <Row label="Tổng số lượng sỉ:" value={`${o.items.length} mẫu / ${pairs} đôi`} />
            <Row label="Nơi nhận hàng:" value={o.delivery} />
            <Row label="Dự kiến xử lý:" value="Trong 2 giờ làm việc" valueColor="#3b82f6" />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href={`/orders/${id}`} className="font-head"
          style={{ height: 48, borderRadius: 8, background: "var(--bq-orange)", color: "#fff", fontSize: 16, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          Xem chi tiết đơn hàng
        </Link>
        <Link href="/" className="btn-outline" style={{ textAlign: "center", textDecoration: "none" }}>Về trang chủ</Link>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 13, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" };
function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={lbl}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color: valueColor || "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{value}</span>
    </div>
  );
}

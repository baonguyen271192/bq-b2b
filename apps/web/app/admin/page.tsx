"use client";
import { useEffect, useState } from "react";
import { Coins, ReceiptText, Wallet, AlertTriangle, Share2, ListChecks, Award, CalendarClock, Boxes } from "lucide-react";
import { api, Analytics, vnd } from "@/lib/api";
import { PageHeader, Tile, SectionCard, BarList, Donut, channelLabel, channelColor } from "./ui";

export default function OverviewPage() {
  const [a, setA] = useState<Analytics | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const load = () => api.analytics().then(setA).catch(() => setErr(true));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (err) return <div style={{ color: "var(--bq-muted)" }}>Không tải được dữ liệu. Vui lòng thử lại sau ít phút.</div>;
  if (!a) return <div style={{ color: "var(--bq-muted)" }}>Đang tải…</div>;

  return (
    <div>
      <PageHeader title="Tổng quan" subtitle="Bức tranh kinh doanh theo thời gian thực — mọi kênh" />

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <Tile label="Tổng doanh số" value={vnd(a.gmv_total)} icon={<Coins size={17} />} />
        <Tile label="Tổng đơn" value={String(a.orders_total)} icon={<ReceiptText size={17} />} />
        <Tile label="Tổng công nợ phải thu" value={vnd(a.total_outstanding)} icon={<Wallet size={17} />}
          accent={a.total_outstanding > 0 ? "#b7791f" : undefined}
          hint={`${a.aging.length} đại lý còn nợ`} />
        <Tile label="Cảnh báo tồn thấp" value={String(a.low_stock.length)} icon={<AlertTriangle size={17} />}
          accent={a.low_stock.length > 0 ? "#e05252" : undefined} hint="còn ≤ 5 đôi/size" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <SectionCard title="Đơn theo kênh" icon={<Share2 size={17} />}>
          <Donut rows={Object.entries(a.by_channel)
            .sort((x, y) => y[1] - x[1])
            .map(([k, v]) => ({ label: channelLabel(k), value: v, color: channelColor(k) }))} />
        </SectionCard>
        <SectionCard title="Đơn theo trạng thái" icon={<ListChecks size={17} />}>
          <BarList color="#3b6fd4"
            rows={Object.entries(a.by_status).map(([k, v]) => ({ label: k, value: v }))} />
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <SectionCard title="Top sản phẩm bán chạy (đôi)" icon={<Award size={17} />}>
          <BarList color="#10b981"
            rows={a.top_products.map((p) => ({ label: p.name, value: p.pairs }))} />
        </SectionCard>
        <SectionCard title="Công nợ theo đại lý" icon={<Wallet size={17} />}>
          <BarList color="#f59e0b" fmt={vnd}
            rows={a.aging.map((d) => ({ label: `${d.name} (${d.code})`, value: d.outstanding }))} />
        </SectionCard>
      </div>

      <SectionCard icon={<CalendarClock size={17} />}
        title="Công nợ theo số ngày chưa thanh toán" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {a.aging_buckets.map((b, i) => {
            const overdue = i >= 1; // >30 ngày coi như quá hạn công nợ 30 ngày
            return (
              <div key={b.label} style={{ border: "1px solid var(--bq-line)", borderRadius: 12,
                padding: "14px 16px", background: overdue && b.amount > 0 ? "#fff7ed" : "#fafbfc" }}>
                <div style={{ fontSize: 13, color: "var(--bq-muted)" }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4,
                  color: overdue && b.amount > 0 ? "#c2410c" : "var(--bq-ink)" }}>{vnd(b.amount)}</div>
                <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 2 }}>{b.count} hoá đơn</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: "var(--bq-muted)", marginTop: 12 }}>
          Nhóm hoá đơn chưa trả theo <b>số ngày</b> kể từ khi đặt. Chính sách công nợ 30 ngày → nhóm{" "}
          <b>31 ngày trở lên</b> (bên phải) là <b>quá hạn</b>, cần ưu tiên thu.
        </div>
      </SectionCard>

      <SectionCard title={`Tồn kho thấp (${a.low_stock.length})`} icon={<Boxes size={17} />}>
        {a.low_stock.length === 0 ? (
          <div style={{ color: "var(--bq-muted)", fontSize: 13 }}>Không có size nào dưới ngưỡng.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {a.low_stock.map((s, i) => (
              <span key={i} style={{
                fontSize: 13, padding: "6px 12px", borderRadius: 20,
                background: s.stock === 0 ? "#fdeaea" : "#fef3c7",
                color: s.stock === 0 ? "#e05252" : "#b7791f", fontWeight: 600,
              }}>
                {s.name} · size {s.size}: {s.stock === 0 ? "hết" : `${s.stock} đôi`}
              </span>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

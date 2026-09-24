import SaleAssistant from "@/components/SaleAssistant";

// Layout riêng cho Web Dashboard (sale/quản lý) — full-width, không khung điện thoại.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8" }}>
      {children}
      <SaleAssistant />
    </div>
  );
}

import BottomNav from "@/components/BottomNav";
import Assistant from "@/components/Assistant";

// Layout cho App đại lý (mobile) — khung điện thoại. BottomNav tự ẩn ở trang chi tiết.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-frame">
      {children}
      <Assistant />
      <BottomNav />
    </div>
  );
}

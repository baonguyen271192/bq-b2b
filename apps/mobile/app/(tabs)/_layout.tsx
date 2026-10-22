import { Tabs } from "expo-router";
import { TabBar, type TabItem } from "@/components/ui";

/**
 * Năm tab theo SPEC §2. Thứ tự này cũng là thứ tự `Tabs.Screen` bên dưới —
 * `TabBar` chỉ nhận danh sách, nó không tự biết route.
 */
const ITEMS: TabItem[] = [
  { key: "index", icon: "home-outline", label: "Trang chủ" },
  { key: "products", icon: "grid-outline", label: "Sản phẩm" },
  { key: "orders", icon: "receipt-outline", label: "Đơn hàng" },
  { key: "debt", icon: "card-outline", label: "Công nợ" },
  { key: "profile", icon: "person-outline", label: "Hồ sơ" },
];

/**
 * Khung 5 tab, dùng {@link TabBar} tự dựng thay cho thanh mặc định.
 *
 * `tabBarStyle: { display: "none" }` KHÔNG thừa dù đã truyền `tabBar`: thiếu nó
 * thì React Navigation vẫn chừa chỗ cho thanh cũ, và màn hình bị thụt lên một
 * khoảng bằng chiều cao thanh đó.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          items={ITEMS}
          active={state.routes[state.index]?.name ?? "index"}
          // `navigateToTab` nhận KHOÁ nội bộ của route, không phải tên file —
          // nên phải tra ngược qua `state.routes` thay vì truyền thẳng tên tab.
          onSelect={(name) => {
            const route = state.routes.find((r) => r.name === name);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      {ITEMS.map((it) => (
        <Tabs.Screen key={it.key} name={it.key} options={{ title: it.label }} />
      ))}
    </Tabs>
  );
}

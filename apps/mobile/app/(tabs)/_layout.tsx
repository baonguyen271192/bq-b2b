import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/lib/cart";
import { color, fontFamily, shadow, space, textStyle } from "@/theme";

/**
 * Icon cho thanh tab.
 *
 * React Native 0.88 khai `color` là `ColorValue` (cho phép null), trong khi
 * `@expo/vector-icons` chỉ nhận `string | undefined`. Gom việc ép kiểu vào một
 * chỗ thay vì rải `as string` ở năm nơi.
 */
function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return function TabIcon({ color: tint, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} size={size} color={(tint as string) ?? undefined} />;
  };
}

/**
 * Chiều cao thanh tab, CHƯA tính vùng an toàn.
 *
 * 72 = padding trên 8 + icon 24 + nhãn 14 + padding dưới 8, còn dư ~18 cho
 * khoảng cách icon/nhãn mà React Navigation tự chèn. Hạ xuống 64 là nhãn bị cắt
 * mất chân chữ — đã đo được đúng vậy trên ảnh chụp: nhãn bắt đầu ở 12pt tính từ
 * đáy màn và bị cắt ngang. Đừng siết lại.
 */
const BAR_H = space.x12 + space.x6;

export default function TabsLayout() {
  const { lines } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: {
          fontFamily: fontFamily.semibold,
          fontSize: textStyle.chip.fontSize,
          letterSpacing: textStyle.chip.letterSpacing,
        },
        tabBarStyle: {
          backgroundColor: color.paper,
          borderTopWidth: 0,
          // Khai chiều cao TƯỜNG MINH cộng vùng an toàn: để mặc định thì nhãn
          // bị cắt mất chân chữ trên máy có thanh cử chỉ, và trên web.
          height: BAR_H + insets.bottom,
          paddingTop: space.x2,
          paddingBottom: insets.bottom + space.x2,
          // Thanh tab là phần tử NỔI nên được phép có bóng — bỏ `borderTopWidth`
          // vì đường kẻ cộng bóng là hai lần tách nền, nhìn nặng.
          ...shadow.dock,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Trang chủ", tabBarIcon: tabIcon("home-outline") }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Sản phẩm",
          tabBarIcon: tabIcon("pricetags-outline"),
          tabBarBadge: lines.length || undefined,
          tabBarBadgeStyle: {
            backgroundColor: color.brand,
            fontFamily: fontFamily.bold,
            fontSize: textStyle.chip.fontSize,
          },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Đơn hàng", tabBarIcon: tabIcon("receipt-outline") }}
      />
      <Tabs.Screen
        name="debt"
        options={{ title: "Công nợ", tabBarIcon: tabIcon("card-outline") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Hồ sơ", tabBarIcon: tabIcon("person-outline") }}
      />
    </Tabs>
  );
}

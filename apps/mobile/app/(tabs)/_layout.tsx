import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/lib/cart";
import { Text, colors, radius } from "@/theme";

/**
 * Icon cho thanh tab.
 *
 * React Native 0.88 khai `color` là `ColorValue` (cho phép null), trong khi
 * `@expo/vector-icons` chỉ nhận `string | undefined`. Gom việc ép kiểu vào một chỗ
 * thay vì rải `as string` ở năm nơi.
 */
function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} size={size} color={(color as string) ?? undefined} />;
  };
}

export default function TabsLayout() {
  const { lines } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // Khai chiều cao TƯỜNG MINH cộng vùng an toàn: để mặc định thì nhãn bị
          // cắt mất chân chữ trên máy có thanh cử chỉ, và trên web.
          height: 66 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: tabIcon("home-outline"),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Sản phẩm",
          tabBarIcon: tabIcon("pricetags-outline"),
          tabBarBadge: lines.length || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand[500], fontFamily: "Inter_700Bold" },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Đơn hàng",
          tabBarIcon: tabIcon("receipt-outline"),
        }}
      />
      <Tabs.Screen
        name="debt"
        options={{
          title: "Công nợ",
          tabBarIcon: tabIcon("card-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: tabIcon("person-outline"),
        }}
      />
    </Tabs>
  );
}

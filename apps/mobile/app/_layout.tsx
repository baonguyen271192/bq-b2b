import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold,
} from "@expo-google-fonts/be-vietnam-pro";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { colors } from "@/legacy-theme";

/**
 * Thời gian tối đa chờ font trước khi vẽ bằng font hệ thống.
 *
 * Trước đây màn hình chờ KHÔNG có đường thoát: `useFonts` không trả true thì app
 * đứng mãi ở vòng xoay. Đã tái hiện được trên bản export web (`expo export -p
 * web`) — treo hơn hai phút, trong khi native cùng mã nguồn chạy bình thường.
 * Chữ nhảy font một nhịp vẫn hơn một app không bao giờ mở.
 */
const FONT_TIMEOUT_MS = 2500;

export default function RootLayout() {
  // Chờ font tải xong rồi mới vẽ: hiện bằng font hệ thống rồi nhảy sang font thật
  // làm chữ "giật" một nhịp, thấy rõ trên máy Android tầm trung.
  const [fontsLoaded, fontError] = useFonts({
    // Be Vietnam Pro: font của bộ giao diện mới (src/components/ui).
    BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold,
    // Inter: các màn CHƯA di trú vẫn dùng. Gỡ ở Phase 5 khi không còn chỗ nào
    // import `@/legacy-theme` — kiểm bằng: grep -rn "@/legacy-theme" app src
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (fontError) {
    console.warn("[BQ] Không nạp được font, dùng font hệ thống:", fontError);
  }

  if (!fontsLoaded && !fontError && !timedOut) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 17, color: colors.text },
                headerTintColor: colors.brand[500],
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="product/[code]" options={{ title: "Chi tiết sản phẩm" }} />
              <Stack.Screen name="order/[id]" options={{ title: "Chi tiết đơn hàng" }} />
              <Stack.Screen name="cart" options={{ title: "Giỏ hàng" }} />
              <Stack.Screen name="checkout" options={{ title: "Xác nhận đơn" }} />
              <Stack.Screen name="assistant" options={{ title: "Trợ lý BQ" }} />
              <Stack.Screen name="notifications" options={{ title: "Thông báo" }} />
            </Stack>
          </CartProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

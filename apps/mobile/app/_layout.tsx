import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { colors } from "@/theme";

export default function RootLayout() {
  // Chờ font tải xong rồi mới vẽ: hiện bằng font hệ thống rồi nhảy sang Inter làm
  // chữ "giật" một nhịp, thấy rõ trên máy Android tầm trung.
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
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

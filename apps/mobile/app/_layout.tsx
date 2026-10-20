import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#fff" },
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#f6f7f9" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "BQ Đại lý" }} />
        <Stack.Screen name="orders" options={{ title: "Đơn sỉ của tôi" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

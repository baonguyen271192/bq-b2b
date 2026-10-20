import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { api, vnd, type Dealer } from "@/lib/api";

/**
 * Màn hình chủ: hạn mức công nợ của đại lý.
 *
 * Mục đích của màn này trong repo là CHỨNG MINH đường dây dùng chung thật sự chạy:
 * cùng `api` client, cùng kiểu `Dealer`, cùng hàm `vnd()` với web — không nhân bản code.
 * Đăng nhập thật chưa có (demo chốt cứng DL001), sẽ thay khi backend có auth.
 */
const DEMO_DEALER = "DL001";

export default function HomeScreen() {
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dealer(DEMO_DEALER).then(setDealer).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Không gọi được API</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Text style={styles.hint}>
          Kiểm tra EXPO_PUBLIC_API_BASE trong .env — emulator Android dùng 10.0.2.2
          thay cho localhost.
        </Text>
      </View>
    );
  }

  if (!dealer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.label}>Đại lý</Text>
        <Text style={styles.name}>{dealer.name}</Text>
        <Text style={styles.tier}>Bậc {dealer.tier}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Hạn mức công nợ</Text>
        <Text style={styles.amount}>{vnd(dealer.credit_available)}</Text>
        <Text style={styles.sub}>
          còn lại / {vnd(dealer.credit_limit)} — đã dùng {vnd(dealer.credit_used)}
        </Text>
      </View>

      <Link href="/orders" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Xem đơn sỉ của tôi</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 4 },
  label: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  tier: { fontSize: 14, color: "#6b7280" },
  amount: { fontSize: 28, fontWeight: "800", color: "#047857" },
  sub: { fontSize: 13, color: "#6b7280" },
  button: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#b91c1c" },
  errorBody: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  hint: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
});

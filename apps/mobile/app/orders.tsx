import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { api, vnd, type Order } from "@/lib/api";

const DEMO_DEALER = "DL001";

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api.orders(DEMO_DEALER).then(setOrders).catch(() => setOrders([]));
  }, []);

  if (!orders) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>Chưa có đơn nào.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.id}>{item.id}</Text>
            <Text style={styles.total}>{vnd(item.subtotal)}</Text>
          </View>
          <Text style={styles.status}>
            {item.status}
            {item.over_limit ? " · vượt hạn mức" : ""}
          </Text>
          <Text style={styles.meta}>
            {item.items.length} mã · {item.channel} · {item.created_at}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  row: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  id: { fontWeight: "700", color: "#111827" },
  total: { fontWeight: "700", color: "#047857" },
  status: { fontSize: 13, color: "#374151" },
  meta: { fontSize: 12, color: "#9ca3af" },
});

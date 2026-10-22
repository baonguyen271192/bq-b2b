import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { color, space } from "@/theme";
import { EmptyState } from "@/components/ui";

/**
 * Thông báo — backend CHƯA có endpoint (xem docs/architecture.md §11).
 *
 * Để màn này rỗng và nói thật, thay vì bịa dữ liệu giả: dữ liệu giả trong app
 * bàn giao sẽ bị nhầm là tính năng đã chạy.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <EmptyState
        icon="notifications-outline"
        title="Chưa có thông báo"
        hint="Thông báo về duyệt hạn mức, trạng thái giao hàng và nhắc công nợ sẽ hiện ở đây."
        actionLabel="Về trang chủ"
        onActionPress={() => router.back()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen },
});

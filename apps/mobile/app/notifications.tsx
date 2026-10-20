import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useRouter } from "expo-router";

/**
 * Thông báo — backend CHƯA có endpoint (xem docs/architecture.md §11).
 *
 * Để màn này rỗng và nói thật, thay vì bịa dữ liệu giả: dữ liệu giả trong app bàn
 * giao sẽ bị nhầm là tính năng đã chạy.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        icon="notifications-outline"
        title="Chưa có thông báo"
        hint="Thông báo về duyệt hạn mức, trạng thái giao hàng và nhắc công nợ sẽ hiện ở đây."
        action={{ label: "Về trang chủ", onPress: () => router.back() }}
      />
    </Screen>
  );
}

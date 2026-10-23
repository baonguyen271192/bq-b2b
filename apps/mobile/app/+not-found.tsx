import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, space } from "@/theme";
import { EmptyState } from "@/components/ui";

/**
 * Đường dẫn không khớp route nào (SPEC §5-N.5).
 *
 * Thiếu file này thì expo-router vẽ màn mặc định của nó: nền đen, chữ tiếng Anh
 * "Unmatched Route — Page could not be found", kèm link "Sitemap" của chế độ
 * phát triển. Một deep link gõ sai, một thông báo đẩy trỏ tới đơn đã xoá, hay
 * một link cũ gửi qua Zalo đều đưa đại lý tới đó.
 */
export default function NotFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <EmptyState
        icon="search-outline"
        title="Không tìm thấy trang này"
        hint="Liên kết có thể đã cũ hoặc nội dung đã bị xoá."
        actionLabel="Về trang chủ"
        onActionPress={() => router.replace("/")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: color.canvas,
    justifyContent: "center", paddingHorizontal: space.screen,
  },
});

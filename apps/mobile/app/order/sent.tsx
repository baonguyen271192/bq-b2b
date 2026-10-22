import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, space } from "@/theme";
import { EmptyState, Pill, T } from "@/components/ui";

/**
 * Màn xác nhận sau khi gửi đơn (SPEC mục 5.D-4).
 *
 * `router.replace` chứ không `push` từ phía Giỏ hàng: bấm back ở đây phải về
 * danh mục, không được quay lại cái giỏ đã trống.
 */
export default function OrderSentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, status } = useLocalSearchParams<{ id?: string; status?: string }>();

  const waiting = (status ?? "").toLowerCase().includes("chờ");

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.x12 }]}>
      <EmptyState
        icon="checkmark-circle-outline"
        tone="ok"
        title={`Đã gửi đơn ${id ?? ""}`.trim()}
        hint={
          waiting
            ? "Đơn vượt hạn mức nên đang chờ Sale duyệt. Bạn nhận thông báo khi có kết quả."
            : "BQ đã nhận đơn và sẽ xác nhận trong giờ làm việc."
        }
      />
      <T variant="small" tone="muted" style={styles.status}>
        {status ? `Trạng thái: ${status}` : ""}
      </T>

      <View style={styles.actions}>
        <Pill
          label="Xem đơn"
          tone="outline"
          style={styles.flex}
          onPress={() => router.replace(id ? `/order/${id}` : "/(tabs)/orders")}
        />
        <Pill label="Về trang chủ" style={styles.flex} onPress={() => router.replace("/(tabs)")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas, paddingHorizontal: space.screen, gap: space.x4 },
  status: { textAlign: "center" },
  actions: { flexDirection: "row", gap: space.x3, marginTop: "auto", marginBottom: space.x8 },
  flex: { flex: 1 },
});

import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { Pill } from "./Pill";
import { T } from "./T";

export interface OfflineBannerProps {
  /** Giờ của dữ liệu đang hiện, dạng "09:12". */
  at: string;
  onRetry?: () => void;
  retrying?: boolean;
  style?: ViewStyle;
}

/**
 * Băng "mất kết nối" đặt ngay dưới header (SPEC §3.15).
 *
 * Nói rõ DỮ LIỆU ĐANG HIỆN LÀ LÚC NÀO, không chỉ "mất mạng": đại lý nhìn số tồn
 * kho để quyết định đặt hàng, nên biết số đó cũ bao nhiêu mới là thông tin có
 * ích. Chỉ báo "mất mạng" thì họ vẫn tin con số trên màn.
 *
 * `accessibilityLiveRegion="polite"`: trình đọc màn hình phải thông báo khi
 * băng xuất hiện, nhưng không cắt ngang câu đang đọc dở.
 */
export function OfflineBanner({ at, onRetry, retrying, style }: OfflineBannerProps) {
  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="cloud-offline-outline" size={20} color={color.warn} />
      <View style={styles.text}>
        <T variant="label" weight="bold">Mất kết nối mạng</T>
        <T variant="small" tone="muted">
          {`Đang hiện dữ liệu lúc ${at}. Giá và tồn kho có thể đã thay đổi.`}
        </T>
      </View>
      {onRetry ? (
        <Pill label="Thử lại" tone="paper" size={36} loading={retrying} onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    backgroundColor: color.warnTint, borderRadius: radius.field, padding: space.x3,
  },
  text: { flex: 1, gap: 1 },
});

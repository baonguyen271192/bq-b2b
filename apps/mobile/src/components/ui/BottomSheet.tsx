import { Modal, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space } from "@/theme";
import { IconButton } from "./IconButton";
import { T } from "./T";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Tiêu đề đơn giản. Bỏ qua khi truyền `header`. */
  title?: string;
  /**
   * Phần đầu tự dựng, thay cho hàng tiêu đề — sheet Đặt nhanh cần thumbnail +
   * mã + tên + giá chứ không phải một dòng chữ (SPEC §3.4). Nút đóng vẫn do
   * sheet vẽ, người gọi không phải lặp lại.
   */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Thanh hành động dán đáy sheet, vd nút "Thêm vào giỏ". */
  footer?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Tấm trượt từ đáy màn.
 *
 * Dùng `Modal` của React Native chứ không thêm thư viện: nó đã xử lý nút Back
 * của Android (`onRequestClose`) và khoá tiêu điểm cho trình đọc màn hình. Thêm
 * một gói chỉ để có cử chỉ kéo là không đáng — sheet này luôn có nút đóng rõ
 * ràng, không phụ thuộc vào việc người dùng đoán ra là vuốt được.
 *
 * Nền mờ bấm được để đóng, VÀ có nút ✕: nền mờ là lối tắt cho người quen dùng,
 * nút là lối đi cho mọi người còn lại.
 */
export function BottomSheet({
  visible, onClose, title, header, children, footer, style,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Đóng" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom }, style]}>
        <View style={styles.grabber} />
        <View style={[styles.head, header ? styles.headCustom : null]}>
          {/* Không tiêu đề và không header tự dựng (sheet Vượt hạn mức) thì chỉ
              còn nút đóng — chừa một dòng chữ rỗng sẽ tạo khoảng trống lớn ở
              đầu sheet. */}
          {header ?? (title?.trim()
            ? <T variant="title" style={styles.title} numberOfLines={1}>{title}</T>
            : <View style={styles.title} />)}
          <IconButton icon="close" tone="subtle" accessibilityLabel="Đóng" onPress={onClose} />
        </View>
        <View style={styles.body}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** SPEC §1: lớp mờ sau sheet là rgba(28,25,21,0.5), không phải đen thuần. */
  scrim: { flex: 1, backgroundColor: color.inkA(0.5) },
  sheet: {
    backgroundColor: color.canvas,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    maxHeight: "86%",
  },
  grabber: {
    width: 40, height: 4, borderRadius: radius.pill, backgroundColor: color.line,
    alignSelf: "center", marginTop: space.x2,
  },
  head: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    paddingHorizontal: space.screen, paddingVertical: space.x3,
  },
  headCustom: { alignItems: "flex-start" },
  title: { flex: 1 },
  body: { paddingHorizontal: space.screen },
  footer: {
    paddingHorizontal: space.screen, paddingTop: space.x3, paddingBottom: space.x3,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line,
    backgroundColor: color.paper,
  },
});

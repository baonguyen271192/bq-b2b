import { StyleSheet, View, type ViewStyle } from "react-native";
import { space } from "@/theme";
import { IconButton } from "./IconButton";
import { T } from "./T";

export interface ScreenHeaderProps {
  title: string;
  /** Dòng phụ 13 muted dưới tiêu đề: "258 mẫu đang bán", "2 mẫu, 50 đôi". */
  caption?: string;
  /** Nút hoặc chip bên phải. */
  trailing?: React.ReactNode;
  /**
   * `tab` — màn gốc trong TabBar: tiêu đề 30/800, không có nút back.
   * `back` — màn chồng lên: nút back tròn + tiêu đề 20/700.
   */
  variant?: "tab" | "back";
  /** Bắt buộc khi `variant="back"`. */
  onBack?: () => void;
  style?: ViewStyle;
}

/**
 * Tiêu đề đầu màn hình, hai kiểu theo SPEC §2.
 *
 * v2 không còn kiểu tiêu đề trên nền cam: mảng cam duy nhất còn chữ là thẻ hạn
 * mức, và nó có component riêng ({@link CreditCard}). Nhờ vậy ở đây không cần
 * nhánh kiểm tra tương phản nào.
 */
export function ScreenHeader({
  title, caption, trailing, variant = "tab", onBack, style,
}: ScreenHeaderProps) {
  const back = variant === "back";
  return (
    <View style={[styles.row, style]}>
      {back && onBack ? (
        <IconButton icon="chevron-back" accessibilityLabel="Quay lại" onPress={onBack} />
      ) : null}
      <View style={styles.text}>
        <T variant={back ? "title" : "screenTitle"} tone="ink" numberOfLines={2}>{title}</T>
        {caption ? <T variant="small" tone="muted">{caption}</T> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  text: { flex: 1, gap: 2 },
  trailing: { flexDirection: "row", alignItems: "center", gap: space.x2 },
});

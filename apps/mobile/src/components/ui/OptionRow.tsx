import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface OptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Một lựa chọn kiểu radio trong nhóm (kho nhận hàng, hình thức thanh toán).
 *
 * Trạng thái chọn báo bằng BA thứ cùng lúc — viền cam, nền tint, và icon radio
 * đầy — chứ không chỉ bằng màu: người mù màu vẫn phân biệt được qua hình icon.
 */
export function OptionRow({ label, selected, onPress, style }: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.row, selected && styles.selected, style]}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={20}
        color={selected ? color.bq : color.faint}
      />
      <T variant="body" weight={selected ? "semibold" : "regular"} style={styles.label}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    minHeight: 56, paddingHorizontal: space.x4,
    borderRadius: radius.field, borderWidth: 1.5, borderColor: color.line,
    backgroundColor: color.paper,
  },
  selected: { borderColor: color.bq, backgroundColor: color.bqTint },
  label: { flex: 1 },
});

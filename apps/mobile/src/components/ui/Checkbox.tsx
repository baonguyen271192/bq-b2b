import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, hitSlopFor, radius, space } from "@/theme";
import { T } from "./T";

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  style?: ViewStyle;
}

/**
 * Ô tick vuông + nhãn (SPEC §3.33).
 *
 * Khác {@link RadioCard}: radio là chọn MỘT trong nhiều và cả thẻ là vùng chạm;
 * checkbox là một lời xác nhận bật/tắt, chỉ ô và nhãn bấm được.
 */
export function Checkbox({ checked, onChange, label, style }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={hitSlopFor(22)}
      style={[styles.row, style]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={16} color={color.white} /> : null}
      </View>
      <T variant="label" weight="regular" style={styles.label}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  box: {
    width: 22, height: 22, borderRadius: radius.chip,
    borderWidth: 2, borderColor: color.line,
    alignItems: "center", justifyContent: "center",
  },
  boxOn: { backgroundColor: color.ink, borderColor: color.ink },
  label: { flex: 1 },
});

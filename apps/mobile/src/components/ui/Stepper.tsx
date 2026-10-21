import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius } from "@/theme";
import { Num } from "./Num";

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Chặn trên — thường là số tồn kho của size đó. */
  max?: number;
  /** Nhấn giữ nút + cộng thêm bấy nhiêu. Bỏ trống thì không bật giữ. */
  longPressStep?: number;
  /** Mô tả cái đang đếm, vd "size 39" → nhãn thành "Tăng số lượng size 39". */
  subject: string;
  style?: ViewStyle;
}

/**
 * Bộ −/+ dạng viên thuốc cao 40.
 * Giá trị 0 trông MỜ (nền canvas, số faint) để mắt lướt qua được; > 0 thì nổi
 * lên (nền trắng, viền cam) — người dùng quét bảng size thấy ngay đã chọn gì.
 */
export function Stepper({ value, onChange, max, longPressStep, subject, style }: StepperProps) {
  const active = value > 0;
  const canAdd = max === undefined || value < max;

  const step = (delta: number) => {
    const next = Math.max(0, max === undefined ? value + delta : Math.min(max, value + delta));
    if (next !== value) onChange(next);
  };

  return (
    <View style={[styles.wrap, active ? styles.active : styles.idle, style]}>
      <Pressable
        onPress={() => step(-1)}
        disabled={value === 0}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Giảm số lượng ${subject}`}
        accessibilityState={{ disabled: value === 0 }}
        style={styles.btn}
      >
        <Ionicons name="remove" size={18} color={value === 0 ? color.faint : color.ink} />
      </Pressable>

      <Num variant="bodyStrong" tone={active ? "ink" : "faint"} style={styles.value}>
        {value}
      </Num>

      <Pressable
        onPress={() => step(1)}
        onLongPress={longPressStep ? () => step(longPressStep) : undefined}
        disabled={!canAdd}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Tăng số lượng ${subject}`}
        accessibilityState={{ disabled: !canAdd }}
        style={styles.btn}
      >
        <Ionicons name="add" size={18} color={canAdd ? color.ink : color.faint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center",
    height: 40, borderRadius: radius.pill, paddingHorizontal: 2,
  },
  idle: { backgroundColor: color.canvas },
  active: { backgroundColor: color.paper, borderWidth: 1.5, borderColor: color.bq },
  btn: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  value: { minWidth: 26, textAlign: "center" },
});

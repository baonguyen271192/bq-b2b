import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";

export interface StepBarProps {
  /** Bước hiện tại, tính từ 1. */
  current: number;
  total: number;
  style?: ViewStyle;
}

/**
 * Thanh tiến trình biểu mẫu nhiều bước (SPEC §3.19): các đoạn 4px, đoạn đã qua ink.
 *
 * Đoạn rời nhau chứ không phải một thanh liền chạy %, vì biểu mẫu có số bước ĐẾM
 * ĐƯỢC — nhìn là biết còn mấy bước nữa, điều mà thanh liền không nói được.
 */
export function StepBar({ current, total, style }: StepBarProps) {
  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Bước ${current} trên ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, i < current ? styles.segOn : styles.segOff]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.x2 },
  seg: { flex: 1, height: 4, borderRadius: radius.pill },
  segOn: { backgroundColor: color.ink },
  segOff: { backgroundColor: color.line },
});

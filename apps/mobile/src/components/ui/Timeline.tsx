import { Fragment } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface TimelineProps {
  steps: string[];
  /** Chỉ số bước HIỆN TẠI. -1 nghĩa là chưa tới bước nào trong danh sách. */
  current: number;
  style?: ViewStyle;
}

const DOT = 22;

/**
 * Dòng thời gian dọc cho vòng đời đơn hàng.
 *
 * Bước đã qua đánh dấu bằng CẢ dấu tích lẫn màu nền, không chỉ màu: trạng thái
 * đơn là thông tin người dùng phải đọc đúng, không được phụ thuộc vào việc phân
 * biệt cam với xám.
 */
export function Timeline({ steps, current, style }: TimelineProps) {
  return (
    <View style={style}>
      {steps.map((step, i) => {
        const done = current >= 0 && i <= current;
        const active = i === current;
        const last = i === steps.length - 1;
        return (
          <Fragment key={step}>
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                  {done ? <Ionicons name="checkmark" size={12} color={color.white} /> : null}
                </View>
                {!last ? <View style={[styles.spine, i < current && styles.spineDone]} /> : null}
              </View>
              <T
                variant={active ? "bodyStrong" : "body"}
                tone={done ? "ink" : "faint"}
                style={last ? undefined : styles.label}
              >
                {step}
              </T>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.x3 },
  rail: { alignItems: "center", width: DOT },
  dot: {
    width: DOT, height: DOT, borderRadius: radius.pill,
    borderWidth: 2, borderColor: color.line, backgroundColor: color.paper,
    alignItems: "center", justifyContent: "center",
  },
  dotDone: { backgroundColor: color.bq, borderColor: color.bq },
  dotActive: { borderColor: color.bq },
  spine: { flex: 1, width: 2, backgroundColor: color.line },
  spineDone: { backgroundColor: color.bq },
  label: { paddingBottom: space.x5 },
});

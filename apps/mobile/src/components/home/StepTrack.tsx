import { Fragment } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "../ui";

export interface StepTrackProps {
  steps: readonly string[];
  /** Chỉ số bước hiện tại. -1 = đơn đã huỷ, không vẽ tiến trình. */
  current: number;
  style?: ViewStyle;
}

/**
 * Tiến trình ngang 4 bước trên thẻ đơn đang giao (SPEC §3.2 mục 4).
 *
 * Chấm bước hiện tại dùng `flame` + vòng `tint` — đây là một trong ba chỗ duy
 * nhất `flame` được phép xuất hiện, và nó không có chữ nào đè lên.
 *
 * Khác `Timeline`: cái kia dọc, có mốc thời gian, dùng ở Chi tiết đơn. Cái này
 * ngang, chỉ có nhãn bước, để liếc một cái là xong.
 */
export function StepTrack({ steps, current, style }: StepTrackProps) {
  return (
    <View
      style={[styles.wrap, style]}
      // Bước ngoài dải (đơn huỷ/từ chối, `current` = -1) thì nói "chưa xác định"
      // chứ không đọc ra một dấu gạch.
      accessibilityLabel={
        steps[current] ? `Tiến trình: ${steps[current]}` : "Tiến trình chưa xác định"
      }
    >
      <View style={styles.dots}>
        {steps.map((s, i) => (
          <Fragment key={s}>
            {i > 0 ? (
              <View style={[styles.link, { backgroundColor: i <= current ? color.ink : color.line }]} />
            ) : null}
            <View style={styles.dotSlot}>
              {i === current ? (
                <View style={styles.halo}>
                  <View style={styles.dotNow} />
                </View>
              ) : (
                <View style={[styles.dot, i < current ? styles.dotDone : styles.dotTodo]} />
              )}
            </View>
          </Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {steps.map((s, i) => (
          <T
            key={s}
            variant="chip"
            weight={i === current ? "bold" : "semibold"}
            tone={i === current ? "ink" : "muted"}
            style={styles.label}
            numberOfLines={1}
          >
            {s}
          </T>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.x2 },
  dots: { flexDirection: "row", alignItems: "center" },
  // Ô chứa chấm rộng bằng vòng sáng (12 + 2×4) để nhãn bên dưới căn đúng tâm chấm.
  dotSlot: { width: 20, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  dotDone: { backgroundColor: color.ink },
  dotTodo: { borderWidth: 2, borderColor: color.line },
  halo: {
    width: 20, height: 20, borderRadius: radius.pill, backgroundColor: color.tint,
    alignItems: "center", justifyContent: "center",
  },
  dotNow: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: color.flame },
  link: { flex: 1, height: 2 },
  labels: { flexDirection: "row" },
  label: { flex: 1, textAlign: "center" },
});

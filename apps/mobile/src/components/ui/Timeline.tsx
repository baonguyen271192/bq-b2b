import { Fragment } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export type TimelineState = "done" | "current" | "todo" | "failed";

export interface TimelineStep {
  label: string;
  /** Mốc thời gian thật, hoặc "Dự kiến 22/10/2026" cho bước chưa tới. */
  caption?: string;
  state: TimelineState;
}

export interface TimelineProps {
  steps: TimelineStep[];
  style?: ViewStyle;
}

const DOT = 22;

/**
 * Dòng thời gian dọc cho vòng đời đơn hàng (SPEC §3.8, §3.18).
 *
 * Bước đã qua đánh dấu bằng CẢ dấu tích lẫn màu nền, bước hỏng bằng CẢ dấu ×
 * lẫn màu — không chỉ màu: trạng thái đơn là thông tin phải đọc đúng, không
 * được phụ thuộc vào việc phân biệt được màu.
 */
export function Timeline({ steps, style }: TimelineProps) {
  return (
    <View style={style}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <Fragment key={s.label}>
            <View style={styles.row}>
              <View style={styles.rail}>
                <Dot state={s.state} />
                {!last ? (
                  <View
                    style={[
                      styles.line,
                      { backgroundColor: s.state === "done" ? color.ink : color.line },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.body}>
                <T
                  variant="label"
                  weight={s.state === "current" ? "bold" : "semibold"}
                  tone={s.state === "failed" ? "danger" : s.state === "todo" ? "muted" : "ink"}
                >
                  {s.label}
                </T>
                {s.caption ? <T variant="chip" tone="muted">{s.caption}</T> : null}
              </View>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

function Dot({ state }: { state: TimelineState }) {
  if (state === "done") {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Ionicons name="checkmark" size={14} color={color.white} />
      </View>
    );
  }
  if (state === "failed") {
    return (
      <View style={[styles.dot, styles.dotFailed]}>
        <Ionicons name="close" size={14} color={color.white} />
      </View>
    );
  }
  if (state === "current") {
    return (
      <View style={[styles.dot, styles.dotCurrent]}>
        <View style={styles.pulse} />
      </View>
    );
  }
  return <View style={[styles.dot, styles.dotTodo]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.x3 },
  rail: { alignItems: "center", width: DOT },
  line: { width: 2, flex: 1, minHeight: space.x4 },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: color.ink },
  dotFailed: { backgroundColor: color.danger },
  dotCurrent: { backgroundColor: color.tint },
  dotTodo: { borderWidth: 2, borderColor: color.line },
  /** Chấm trong của bước hiện tại dùng `flame` — chỗ không có chữ nhỏ. */
  pulse: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color.flame },
  body: { flex: 1, paddingBottom: space.x4, gap: 1 },
});

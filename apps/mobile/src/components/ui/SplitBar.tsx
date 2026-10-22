import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface SplitBarProps {
  /** Phần nằm trong hạn mức. */
  within: number;
  /** Phần vượt quá. */
  over: number;
  leftLabel: string;
  rightLabel: string;
  style?: ViewStyle;
}

/**
 * Thanh 10px chia hai đoạn: trong hạn mức (ink) | phần vượt (danger) — SPEC §3.14.
 *
 * Hai đoạn đều có SÀN 4% bề rộng: vượt 12,4 trên 200 triệu chỉ là 6%, mà dưới
 * vài phần trăm thì đoạn đỏ mảnh tới mức không thấy — đúng lúc nó cần được thấy
 * nhất. Nhãn chữ hai đầu mới là con số chính xác.
 */
export function SplitBar({ within, over, leftLabel, rightLabel, style }: SplitBarProps) {
  const total = Math.max(1, within + over);
  const overPct = Math.min(96, Math.max(over > 0 ? 4 : 0, (over / total) * 100));

  return (
    <View style={style}>
      <View style={styles.track}>
        <View style={[styles.seg, styles.within, { width: `${100 - overPct}%` }]} />
        {over > 0 ? <View style={[styles.seg, styles.over, { width: `${overPct}%` }]} /> : null}
      </View>
      <View style={styles.labels}>
        <T variant="small" tone="muted">{leftLabel}</T>
        <T variant="small" weight="semibold" tone="danger">{rightLabel}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", height: 10, borderRadius: radius.pill, overflow: "hidden" },
  seg: { height: 10 },
  within: { backgroundColor: color.ink },
  over: { backgroundColor: color.danger },
  labels: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: space.x2, gap: space.x3,
  },
});

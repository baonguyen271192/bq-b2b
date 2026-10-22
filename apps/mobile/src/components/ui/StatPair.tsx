import { Fragment } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, space } from "@/theme";
import { T } from "./T";

export interface StatPairItem {
  label: string;
  /** Giá trị — truyền `<Price>` hoặc `<Num>` để giữ tabular-nums. */
  value: React.ReactNode;
}

export interface StatPairProps {
  items: StatPairItem[];
  style?: ViewStyle;
}

/**
 * Hai (hoặc hơn) chỉ số đặt cạnh nhau, ngăn bằng vạch dọc.
 *
 * `alignSelf: "stretch"` cho vạch ngăn thay vì chốt chiều cao: nhãn dài xuống
 * hai dòng thì vạch tự dài theo, không bị hụt một nửa.
 */
export function StatPair({ items, style }: StatPairProps) {
  return (
    <View style={[styles.row, style]}>
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 ? <View style={styles.vline} /> : null}
          <View style={styles.cell}>
            <T variant="chip" tone="muted">{it.label}</T>
            {it.value}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch" },
  cell: { flex: 1, gap: space.x1 },
  vline: { width: 1, alignSelf: "stretch", backgroundColor: color.line, marginHorizontal: space.x4 },
});

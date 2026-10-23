import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, shadow, space } from "@/theme";
import { T } from "./T";

export interface DockSummary {
  label: string;
  /** Thường là `<Price>` hoặc `<Num>` — người gọi chọn bậc chữ cho đúng màn. */
  value: React.ReactNode;
}

export interface DockProps {
  /** Hàng tóm tắt bên trái: "18 đôi đã chọn" + tổng tiền. */
  left?: DockSummary;
  /** Hàng tóm tắt bên phải: "Hạn mức còn" + số. */
  right?: DockSummary;
  /**
   * Hàng tóm tắt TỰ DỰNG, thay cho cặp `left`/`right`. Dùng khi hai số có logic
   * riêng — vd `OrderDock` của màn chọn size (SPEC §5-N.3).
   */
  custom?: React.ReactNode;
  /** Nút hành động — một hoặc hai `Pill`. */
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Thanh hành động cố định ở đáy (SPEC §2): bo 2 góc trên 28, bóng hắt LÊN.
 *
 * Nội dung cuộn phía trên phải chừa `paddingBottom` bằng {@link DOCK_CLEARANCE}
 * (có hàng tóm tắt) hoặc {@link DOCK_CLEARANCE_ACTIONS} (chỉ có nút) cộng
 * safe area — nếu không, dòng cuối của danh sách nằm vĩnh viễn dưới thanh này.
 */
export function Dock({ left, right, custom, children, style }: DockProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 14 }, shadow.dock, style]}>
      {custom ? <View style={styles.summary}>{custom}</View> : left || right ? (
        <View style={styles.summary}>
          {left ? (
            <View style={styles.col}>
              <T variant="small" tone="muted">{left.label}</T>
              {left.value}
            </View>
          ) : <View style={styles.col} />}
          {right ? (
            <View style={[styles.col, styles.colRight]}>
              <T variant="small" tone="muted">{right.label}</T>
              {right.value}
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

/** Có hàng tóm tắt: 14 + 44 + 12 + 54 + 14, cộng 16 chừa theo SPEC §4. */
export const DOCK_CLEARANCE = 154;
/** Chỉ có nút: 14 + 54 + 14, cộng 16. */
export const DOCK_CLEARANCE_ACTIONS = 98;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.screen, paddingTop: 14,
    gap: space.x3,
  },
  summary: { flexDirection: "row", alignItems: "flex-end", gap: space.x3 },
  col: { flex: 1, gap: 2 },
  colRight: { alignItems: "flex-end" },
  actions: { flexDirection: "row", gap: space.x3 },
});

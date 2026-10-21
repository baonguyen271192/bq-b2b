import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  style?: ViewStyle;
}

/**
 * Bộ chọn một-trong-nhiều dạng viên thuốc (lọc đơn hàng theo trạng thái).
 * Khác {@link Chip}: SegmentedControl là một nhóm liền khối, luôn có đúng một
 * mục được chọn; Chip rời nhau và có thể không chọn gì.
 */
export function SegmentedControl<T extends string>({
  options, value, onChange, style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.itemActive]}
          >
            <T variant="small" weight="semibold" tone={active ? "white" : "muted"}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: color.paper, borderRadius: radius.pill,
    padding: space.x1, borderWidth: 1, borderColor: color.line, gap: space.x1,
  },
  item: {
    flex: 1, height: 38, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  itemActive: { backgroundColor: color.ink },
});

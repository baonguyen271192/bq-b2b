import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { productSwatch } from "@bq/tokens";
import { color, radius, space } from "@/theme";
import { T } from "../ui";

export interface ColorPickerProps {
  colors: string[];
  value: string;
  onChange: (next: string) => void;
  /**
   * `chip` — một chip cao 32 trong sheet Đặt nhanh (SPEC §3.4).
   * `pill` — hàng radio cao 40 ở màn Chi tiết (SPEC §3.5).
   */
  variant?: "chip" | "pill";
  style?: ViewStyle;
}

/**
 * Chọn màu của mẫu (SPEC §3.4, §3.5).
 *
 * ⚠️ TODO(api): lựa chọn này CHƯA đi vào đơn. `CartLine` và `OrderItem` chỉ có
 * `code` + `sizes` (xem `packages/types/src/order.ts`), nên đổi màu hiện chỉ đổi
 * thứ đang xem chứ không đổi thứ sẽ đặt. Đổi được điều đó là đổi cấu trúc giỏ
 * hàng và payload tạo đơn — ngoài phạm vi đợt giao diện này, đã ghi vào báo cáo.
 */
export function ColorPicker({
  colors, value, onChange, variant = "chip", style,
}: ColorPickerProps) {
  if (colors.length === 0) return null;
  const pill = variant === "pill";
  return (
    <View style={[styles.row, style]} accessibilityRole="radiogroup">
      {colors.map((c) => (
        <ColorOption
          key={c}
          name={c}
          selected={c === value}
          pill={pill}
          onPress={() => onChange(c)}
        />
      ))}
    </View>
  );
}

function ColorOption({
  name, selected, pill, onPress,
}: { name: string; selected: boolean; pill: boolean; onPress: () => void }) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="radio"
      accessibilityLabel={`Màu ${name}`}
      accessibilityState={{ checked: selected }}
      style={[
        styles.option,
        pill ? styles.pill : styles.chip,
        selected ? styles.on : styles.off,
        down && styles.down,
      ]}
    >
      <View
        style={[
          styles.dot,
          pill ? styles.dotPill : styles.dotChip,
          { backgroundColor: productSwatch(name) ?? color.subtle },
        ]}
      />
      <T variant="label" weight={selected ? "semibold" : "regular"}>{name}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.x2, alignItems: "center" },
  option: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    borderRadius: radius.pill, backgroundColor: color.paper,
  },
  chip: { height: 32, paddingLeft: space.x2, paddingRight: space.x3 },
  pill: { height: 40, paddingLeft: space.x1, paddingRight: space.x4 },
  on: { borderWidth: 1.5, borderColor: color.ink },
  // Bù 0.5 bằng viền trong suốt để chữ không nhích khi đổi lựa chọn.
  off: { borderWidth: 1, borderColor: color.line, margin: 0.5 },
  down: { opacity: 0.75 },
  dot: { borderWidth: 1, borderColor: color.line },
  dotChip: { width: 14, height: 14, borderRadius: radius.pill },
  dotPill: { width: 28, height: 28, borderRadius: radius.pill },
});

import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, shadow, space } from "@/theme";
import { T } from "./T";

export interface TabItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export interface TabBarProps {
  items: TabItem[];
  active: string;
  onSelect: (key: string) => void;
  style?: ViewStyle;
}

/**
 * Thanh tab viên thuốc NỔI, căn giữa, cách đáy 24 + safe area (SPEC §2).
 *
 * Chỉ tab đang chọn mới hiện chữ. Bốn nhãn luôn hiện thì thanh phải rộng gần
 * hết màn và mất dáng viên thuốc; chỉ hiện nhãn của tab hiện tại giữ được
 * khối gọn mà vẫn nói rõ "bạn đang ở đâu".
 *
 * Đây là nơi DUY NHẤT trong app dùng nền `brand` cho một mục nhỏ: chữ trắng
 * 13/600 trên `brand` đạt 4.79:1 nên hợp lệ.
 */
export function TabBar({ items, active, onSelect, style }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
      <View style={[styles.bar, style]} accessibilityRole="tablist">
        {items.map((it) => {
          const on = it.key === active;
          return (
            <Pressable
              key={it.key}
              onPress={() => onSelect(it.key)}
              accessibilityRole="tab"
              accessibilityLabel={it.label}
              accessibilityState={{ selected: on }}
              style={[styles.item, on && styles.itemOn]}
            >
              <Ionicons name={it.icon} size={20} color={on ? color.white : color.whiteA(0.78)} />
              {on ? <T variant="small" weight="semibold" tone="white">{it.label}</T> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Chừa đáy cho nội dung cuộn ở màn có TabBar (SPEC §4: ≥ 120). */
export const TAB_BAR_CLEARANCE = 120;

const styles = StyleSheet.create({
  outer: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  bar: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: color.ink, borderRadius: radius.pill, padding: 6,
    ...shadow.tabBar,
  },
  item: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    height: 48, minWidth: 48, borderRadius: radius.pill, justifyContent: "center",
  },
  itemOn: { backgroundColor: color.brand, paddingHorizontal: space.x4 },
});

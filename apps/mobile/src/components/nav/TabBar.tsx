import { StyleSheet, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, shadow, space } from "@/theme";
import { Badge, T } from "../ui";

export interface TabBarItem {
  /** Khớp `name` của <Tabs.Screen>. */
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

export interface TabBarProps {
  items: TabBarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/** Chiều cao thanh tab nổi, chưa gồm safe area — dùng tính paddingBottom cho ScrollView. */
export const TABBAR_CLEARANCE = 92;

/**
 * Thanh tab dạng viên thuốc NỔI giữa đáy màn hình.
 *
 * Truyền qua prop `tabBar` của `<Tabs>`. Tab đang chọn là viên thuốc cam chứa
 * icon đặc + nhãn; các tab khác chỉ có icon viền màu trắng 62%.
 */
export function TabBar({ items, activeKey, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom || space.x4 }]} pointerEvents="box-none">
      <View style={[styles.bar, shadow.float]}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <View>
                <Ionicons
                  name={active ? item.iconActive : item.icon}
                  size={20}
                  color={active ? color.white : color.whiteA(0.62)}
                />
                {item.badge ? (
                  <Badge count={item.badge} ringColor="ink" style={styles.badge} />
                ) : null}
              </View>
              {active ? (
                <T variant="micro" tone="white">{item.label}</T>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    alignItems: "center", paddingHorizontal: space.screen,
  },
  bar: {
    flexDirection: "row", alignItems: "center", gap: space.x1,
    backgroundColor: color.ink, borderRadius: radius.pill,
    padding: space.x1,
  },
  tab: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    height: 48, minWidth: 48, paddingHorizontal: space.x3,
    borderRadius: radius.pill, justifyContent: "center",
  },
  tabActive: { backgroundColor: color.bq, paddingHorizontal: space.x4 },
  badge: { position: "absolute", top: -6, right: -10 },
});

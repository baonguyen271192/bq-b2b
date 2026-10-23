import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { color, radius, shadow, space } from "@/theme";
import { T } from "./T";

export interface SegmentedControlProps<T extends string> {
  /** `count` hiện trong ngoặc sau nhãn: "Chờ duyệt (1)". 0 thì không hiện. */
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  style?: ViewStyle;
}

/**
 * Ngưỡng đổi dạng: CHỈ cỡ chữ mặc định giữ rãnh liền khối.
 *
 * Đo trên iPhone 17 Pro (`xcrun simctl ui <udid> content_size`):
 *
 * | Cỡ chữ hệ thống           | fontScale |
 * | ------------------------- | --------- |
 * | large (mặc định)          | 1.000     |
 * | extra-large               | 1.118     |
 * | extra-extra-large         | 1.235     |
 * | extra-extra-extra-large   | 1.353     |
 * | accessibility-medium      | 1.786     |
 *
 * SPEC/chỉ thị ban đầu nêu ngưỡng 1.2, nhưng ảnh chụp cho thấy mục cuối ("Đã
 * nhận") ĐÃ bị cắt ngay ở `extra-large` = 1.118 — tức dưới 1.2. Lấy 1.05 để
 * ngưỡng thật sự chặn đúng trường hợp đang hỏng, trong khi cỡ mặc định (đúng
 * 1.0) vẫn không đổi một pixel nào.
 */
const SCROLL_ABOVE_FONT_SCALE = 1.05;

/**
 * Bộ chọn một-trong-nhiều dạng viên thuốc (SPEC §2) — lọc đơn hàng, lọc thông báo.
 *
 * Mục đang chọn nổi lên bằng nền `paper` + bóng rất nhẹ trên rãnh `track`, chứ
 * không đảo màu sang ink: cả nhóm nằm ngay dưới tiêu đề màn, đảo sang khối đen
 * sẽ tranh mất sự chú ý với tiêu đề.
 *
 * Ở cỡ chữ lớn, nó đổi sang HÀNG CHIP CUỘN NGANG, tràn hết bề ngang màn. Hai
 * cách chữa khác đều đã thử và đều hỏng: để tràn thì mục cuối bị cắt; cho
 * `flexShrink` thì Yoga co CẢ BỐN ngay ở cỡ mặc định ("Tất cả" thành "Tất …").
 * Đổi dạng theo ngưỡng giữ cỡ mặc định y nguyên thiết kế.
 *
 * Khác {@link Chip}: SegmentedControl là một nhóm liền khối, luôn có đúng một
 * mục được chọn; Chip rời nhau và có thể không chọn gì.
 */
export function SegmentedControl<T extends string>({
  options, value, onChange, style,
}: SegmentedControlProps<T>) {
  const { fontScale } = useWindowDimensions();
  const scrolls = fontScale > SCROLL_ABOVE_FONT_SCALE;

  const items = options.map((o) => {
    const active = o.value === value;
    const label = o.count ? `${o.label} (${o.count})` : o.label;
    return (
      <Pressable
        key={o.value}
        onPress={() => onChange(o.value)}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={[
          styles.item,
          scrolls && styles.chipItem,
          active && styles.itemActive,
          scrolls && !active && styles.chipIdle,
        ]}
      >
        <T variant="small" weight="semibold" tone={active ? "ink" : "muted"} numberOfLines={1}>
          {label}
        </T>
      </Pressable>
    );
  });

  if (scrolls) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Âm lề màn rồi đệm lại 20: hàng chip chạy hết bề ngang máy, nhưng chip
        // đầu và chip cuối vẫn thẳng hàng với mọi thứ khác trên màn.
        style={[styles.scroller, style]}
        contentContainerStyle={styles.scrollRow}
        accessibilityRole="tablist"
      >
        {items}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: color.track,
    borderRadius: radius.pill, padding: space.x1,
  },
  scroller: { marginHorizontal: -space.screen },
  scrollRow: { flexDirection: "row", gap: space.x2, paddingHorizontal: space.screen },
  /**
   * `flexBasis: "auto"` chứ KHÔNG `flex: 1`: chia đều bốn phần thì "Chờ duyệt (1)"
   * ở khổ 390 bị cắt thành "Chờ duy…". Để mục tự rộng theo chữ rồi mới chia phần
   * dư — đúng như bộ ảnh thiết kế, nơi "Tất cả" hẹp hơn hẳn ba mục kia.
   */
  item: {
    flexGrow: 1, flexBasis: "auto", height: 40, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.x3,
  },
  /** Ở dạng cuộn, mỗi mục là một chip rời nên không co giãn theo chỗ trống. */
  chipItem: { flexGrow: 0, paddingHorizontal: space.x4 },
  chipIdle: { backgroundColor: color.track },
  itemActive: { backgroundColor: color.paper, ...shadow.segment },
});

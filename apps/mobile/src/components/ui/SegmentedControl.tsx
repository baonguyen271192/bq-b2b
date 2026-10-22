import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
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
 * Bộ chọn một-trong-nhiều dạng viên thuốc (SPEC §2) — lọc đơn hàng, lọc thông báo.
 *
 * Mục đang chọn nổi lên bằng nền `paper` + bóng rất nhẹ trên rãnh `track`, chứ
 * không đảo màu sang ink: cả nhóm nằm ngay dưới tiêu đề màn, đảo sang khối đen
 * sẽ tranh mất sự chú ý với tiêu đề.
 *
 * Khác {@link Chip}: SegmentedControl là một nhóm liền khối, luôn có đúng một
 * mục được chọn; Chip rời nhau và có thể không chọn gì.
 */
export function SegmentedControl<T extends string>({
  options, value, onChange, style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        const label = o.count ? `${o.label} (${o.count})` : o.label;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.itemActive]}
          >
            <T variant="small" weight="semibold" tone={active ? "ink" : "muted"} numberOfLines={1}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: color.track,
    borderRadius: radius.pill, padding: space.x1,
  },
  /**
   * `flexBasis: "auto"` chứ KHÔNG `flex: 1`: chia đều bốn phần thì "Chờ duyệt (1)"
   * ở khổ 390 bị cắt thành "Chờ duy…". Để mục tự rộng theo chữ rồi mới chia phần
   * dư — đúng như bộ ảnh thiết kế, nơi "Tất cả" hẹp hơn hẳn ba mục kia.
   *
   * `flexShrink: 1` + `minWidth: 0` chỉ có tác dụng khi hàng KHÔNG đủ chỗ, nên ở
   * cỡ chữ mặc định không đổi một pixel nào. Ở cỡ chữ lớn hơn một bậc thì bốn mục
   * rộng hơn bề ngang máy: thiếu hai dòng này, mục cuối ("Đã nhận") tràn ra ngoài
   * rãnh và bị mép màn hình cắt cụt — đo trên iPhone 17 Pro ở cỡ `extra-large`.
   */
  item: {
    flexGrow: 1, flexShrink: 1, flexBasis: "auto", minWidth: 0,
    height: 40, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.x3,
  },
  itemActive: { backgroundColor: color.paper, ...shadow.segment },
});

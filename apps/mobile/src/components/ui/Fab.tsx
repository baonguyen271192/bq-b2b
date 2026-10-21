import { useState } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, shadow, space } from "@/theme";

/** Đường kính nút. */
const FAB_SIZE = 56;
/** Khoảng cách từ đáy vùng an toàn lên tâm dưới nút. */
const FAB_BOTTOM = space.x6;

/**
 * Khoảng hở nội dung phải chừa ở đáy để FAB không đè lên hàng cuối.
 *
 * Màn hình PHẢI cộng giá trị này vào `paddingBottom` của khung cuộn. Đã quên một
 * lần: thẻ đơn cuối cùng nằm khuất sau nút, chụp màn hình mới thấy.
 */
export const FAB_CLEARANCE = FAB_BOTTOM + FAB_SIZE + space.x4;

export interface FabProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** BẮT BUỘC: nút chỉ có icon thì trình đọc màn hình không có gì để đọc. */
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * Nút tròn nổi 56, neo ở góc màn hình.
 *
 * Khác {@link IconButton}: cái kia 44 và nằm TRONG luồng nội dung (thanh tiêu
 * đề, danh sách), cái này nổi đè lên nội dung nên có bóng — một trong hai chỗ
 * duy nhất được phép dùng `shadow` (xem chú thích ở theme.ts).
 *
 * Nền `ink` chứ không phải `bq`: trên màn có nhiều cam sẵn (dải hero, nút chính,
 * số tiền) thì thêm một nút cam nữa là mất thứ bậc — mắt không biết nhìn đâu.
 */
export function Fab({ icon, onPress, accessibilityLabel, style }: FabProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, down && styles.down, style]}
    >
      <Ionicons name={icon} size={22} color={color.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: radius.pill, backgroundColor: color.ink,
    alignItems: "center", justifyContent: "center", ...shadow.float,
  },
  down: { transform: [{ scale: 0.96 }] },
});

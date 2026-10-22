import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { color, hitSlopFor, radius } from "@/theme";

export interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  /** BẮT BUỘC: công tắc không có nhãn chữ bên trong. */
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * Công tắc 44×26 (SPEC §2). Bật = nền ink, núm 20 trắng.
 *
 * Tự dựng thay vì dùng `Switch` của RN: bản gốc lấy màu theo nền tảng (xanh iOS)
 * và không nhận được bo góc/kích thước, nên đặt cạnh các thành phần khác là lạc
 * hẳn. Vùng chạm nới lên 44 bằng `hitSlop`.
 */
export function Switch({ value, onValueChange, disabled, accessibilityLabel, style }: SwitchProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={hitSlopFor(26)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[
        styles.track,
        { backgroundColor: value ? color.ink : color.line },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: radius.pill, justifyContent: "center" },
  knob: {
    width: 20, height: 20, borderRadius: radius.pill, backgroundColor: color.white,
    position: "absolute",
  },
  knobOn: { right: 3 },
  knobOff: { left: 3 },
  disabled: { opacity: 0.4 },
});

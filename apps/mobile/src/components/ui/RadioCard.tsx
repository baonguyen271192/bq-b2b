import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface RadioCardProps {
  selected: boolean;
  onPress: () => void;
  /** Tiêu đề 15/600. Bỏ trống khi dùng `children` để dựng nội dung riêng. */
  title?: string;
  /** Mô tả 13/18 muted dưới tiêu đề. */
  description?: string;
  /** Nội dung tự dựng thay cho title/description — vd {@link AddressCard}. */
  children?: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Thẻ lựa chọn có vòng radio (SPEC §2): sheet Vượt hạn mức, sheet "Tồn kho đã
 * thay đổi", sheet chọn địa chỉ.
 *
 * Component KHÔNG tự đóng sheet. Hai màn dùng nó có hành vi khác nhau — chọn
 * địa chỉ thì chạm là chọn rồi đóng ngay, còn sheet vượt hạn mức thì chọn xong
 * vẫn phải bấm CTA — nên quyết định đó thuộc về màn, không thuộc về thẻ.
 */
export function RadioCard({
  selected, onPress, title, description, children, disabled, accessibilityLabel, style,
}: RadioCardProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={[
        styles.base,
        selected ? styles.on : styles.off,
        disabled && styles.disabled,
        down && styles.down,
        style,
      ]}
    >
      <View style={[styles.ring, selected ? styles.ringOn : styles.ringOff]} />
      <View style={styles.body}>
        {children ?? (
          <>
            {title ? <T variant="bodyStrong" weight="semibold">{title}</T> : null}
            {description ? <T variant="small" tone="muted">{description}</T> : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row", alignItems: "flex-start", gap: space.x3,
    padding: 14, borderRadius: radius.option, backgroundColor: color.paper,
  },
  on: { borderWidth: 1.5, borderColor: color.ink },
  // Bù 0.5 bằng padding để nội dung không nhích khi đổi lựa chọn.
  off: { borderWidth: 1, borderColor: color.line, padding: 14.5 },
  disabled: { opacity: 0.4 },
  down: { transform: [{ scale: 0.98 }] },
  ring: { width: 22, height: 22, borderRadius: radius.pill, marginTop: 1 },
  ringOn: { borderWidth: 6, borderColor: color.ink },
  ringOff: { borderWidth: 2, borderColor: color.line },
  body: { flex: 1, gap: 2 },
});

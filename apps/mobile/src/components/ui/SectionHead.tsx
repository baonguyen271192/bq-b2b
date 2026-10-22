import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { space } from "@/theme";
import { T } from "./T";

export interface SectionHeadProps {
  title: string;
  /** Hành động bên phải, vd "Xem tất cả". Bỏ trống thì không hiện. */
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

/** Tiêu đề một khối nội dung trong màn hình, kèm hành động phụ bên phải. */
export function SectionHead({ title, actionLabel, onActionPress, style }: SectionHeadProps) {
  return (
    <View style={[styles.row, style]}>
      <T variant="section">{title}</T>
      {actionLabel ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <T variant="small" weight="semibold" tone="brand">{actionLabel}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: space.x3,
  },
});

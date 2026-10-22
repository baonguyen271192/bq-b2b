import { StyleSheet, View, type ViewStyle } from "react-native";
import { T } from "./T";
import { TextButton } from "./TextButton";

export interface SectionHeadProps {
  title: string;
  /** Hành động bên phải, 14/600 ink (SPEC §3.2). Bỏ trống thì không hiện. */
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

/** Tiêu đề một khối nội dung trong màn hình, kèm hành động phụ bên phải. */
export function SectionHead({ title, actionLabel, onActionPress, style }: SectionHeadProps) {
  return (
    <View style={[styles.row, style]}>
      <T variant="section">{title}</T>
      {actionLabel ? <TextButton label={actionLabel} onPress={onActionPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // KHÔNG có marginBottom: khoảng cách tới nội dung do `gap` của màn quyết định.
  // Thành phần tự chừa lề dưới thì hai cơ chế cộng dồn và mỗi màn lệch một kiểu.
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

import { StyleSheet, TextInput, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, fontFamily, radius, space, textStyle } from "@/theme";
import { IconButton } from "./IconButton";

export interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/** Ô tìm kiếm dạng viên thuốc, có nút xoá khi đã gõ. */
export function SearchField({
  value, onChangeText, placeholder = "Tìm mẫu giày hoặc mã sản phẩm",
  accessibilityLabel = "Tìm sản phẩm", style,
}: SearchFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={18} color={color.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.muted}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close"
          tone="light"
          accessibilityLabel="Xoá nội dung tìm kiếm"
          onPress={() => onChangeText("")}
          style={styles.clear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    height: 52, paddingLeft: space.x5, paddingRight: space.x1,
    borderRadius: radius.pill, backgroundColor: color.paper,
    borderWidth: 1, borderColor: color.line,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: textStyle.body.fontSize,
    color: color.ink,
  },
  // Thu còn 36 cho vừa ô cao 48; `IconButton` đã nới vùng chạm về 44 bằng
  // hitSlop nên phần hụt 8px vẫn bấm được.
  clear: { width: 36, height: 36 },
});

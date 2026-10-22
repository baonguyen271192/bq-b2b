import { StyleSheet, TextInput, View, type KeyboardTypeOptions, type ViewStyle } from "react-native";
import { color, fontFamily, radius, space, textStyle } from "@/theme";
import { T } from "./T";

export interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  /** Nhãn phía trên ô. */
  label?: string;
  placeholder?: string;
  /** Chữ cố định nằm trước ô nhập, vd "+84". */
  prefix?: string;
  /** Câu lỗi dưới ô — ô đổi sang viền danger khi có. */
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Ô nhập một dòng (hoặc nhiều dòng) có nhãn.
 *
 * Khác {@link SearchField}: cái kia là ô tìm kiếm dạng viên thuốc có nút xoá;
 * cái này là trường biểu mẫu, có nhãn và chỗ báo lỗi.
 */
export function TextField({
  value, onChangeText, label, placeholder, prefix, error,
  keyboardType, multiline, onSubmitEditing, accessibilityLabel, style,
}: TextFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <T variant="small" tone="muted">{label}</T> : null}
      <View style={[styles.field, multiline && styles.multiline, error ? styles.fieldError : null]}>
        {prefix ? (
          <>
            <T variant="bodyStrong">{prefix}</T>
            <View style={styles.divider} />
          </>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
      {error ? <T variant="chip" tone="danger">{error}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.x2 },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    minHeight: 56, paddingHorizontal: space.x4,
    borderRadius: radius.field, borderWidth: 1.5, borderColor: color.line,
    backgroundColor: color.paper,
  },
  // Nhiều dòng thì căn chữ lên TRÊN, không giữa: ô cao dần theo nội dung mà chữ
  // vẫn dính giữa thì dòng đầu tụt xuống, trông như ô bị lệch.
  multiline: { alignItems: "flex-start", paddingVertical: space.x3 },
  fieldError: { borderColor: color.danger },
  divider: { width: 1, height: 24, backgroundColor: color.line },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: textStyle.body.fontSize,
    color: color.ink,
  },
  inputMultiline: { maxHeight: 110, paddingTop: 0 },
});

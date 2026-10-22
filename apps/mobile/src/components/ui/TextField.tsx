import { StyleSheet, TextInput, View, type KeyboardTypeOptions, type ViewStyle } from "react-native";
import { color, fontFamily, radius, space, textStyle } from "@/theme";
import { T } from "./T";

export interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  /** Nhãn phía trên ô, 14/600 ink (SPEC §3.1, §3.19). */
  label?: string;
  placeholder?: string;
  /** Chữ cố định nằm trước ô nhập, vd "+84". */
  prefix?: string;
  /** Gợi ý 13 muted dưới ô, vd "Dùng số này để đăng nhập bằng OTP". */
  hint?: string;
  /** Câu lỗi dưới ô — ô đổi sang viền danger khi có. Ghi đè `hint`. */
  error?: string | null;
  /**
   * `strong` — ô chính của màn (Đăng nhập): cao 56, viền 1.5 ink.
   * `form` — trường trong biểu mẫu dài (Đăng ký, Sổ địa chỉ): cao 52, viền 1 line.
   */
  variant?: "strong" | "form";
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Ô nhập một dòng (hoặc nhiều dòng) có nhãn.
 *
 * Hai biến thể khác nhau ở ĐỘ NẶNG của viền, không chỉ ở chiều cao: ô duy nhất
 * của màn Đăng nhập cần hút mắt nên viền 1.5 ink; còn sáu trường liên tiếp của
 * màn Đăng ký mà cũng viền đậm thì cả màn thành một lưới kẻ ô.
 *
 * Khác {@link SearchField}: cái kia là ô tìm kiếm dạng viên thuốc có nút xoá.
 */
export function TextField({
  value, onChangeText, label, placeholder, prefix, hint, error, variant = "form",
  keyboardType, multiline, autoFocus, onSubmitEditing, accessibilityLabel, style,
}: TextFieldProps) {
  const strong = variant === "strong";
  return (
    <View style={[styles.wrap, style]}>
      {label ? <T variant="label" weight="semibold">{label}</T> : null}
      <View
        style={[
          styles.field,
          strong ? styles.strong : styles.form,
          multiline && styles.multiline,
          error ? styles.fieldError : null,
        ]}
      >
        {prefix ? (
          <>
            <T variant="cardTitle" weight="semibold">{prefix}</T>
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
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
      {error ? <T variant="small" tone="danger">{error}</T> : null}
      {!error && hint ? <T variant="small" tone="muted">{hint}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.x2 },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    paddingHorizontal: space.x4, borderRadius: radius.field,
    backgroundColor: color.paper,
  },
  strong: { minHeight: 56, borderWidth: 1.5, borderColor: color.ink },
  form: { minHeight: 52, borderWidth: 1, borderColor: color.line },
  // Nhiều dòng thì căn chữ lên TRÊN, không giữa: ô cao dần theo nội dung mà chữ
  // vẫn dính giữa thì dòng đầu tụt xuống, trông như ô bị lệch.
  multiline: { alignItems: "flex-start", paddingVertical: space.x3 },
  fieldError: { borderColor: color.danger },
  divider: { width: 1, height: 24, backgroundColor: color.line },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: textStyle.cardTitle.fontSize,
    color: color.ink,
  },
  inputMultiline: { maxHeight: 110, paddingTop: 0 },
});

import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from "react-native";
import { color, radius, space, text } from "@/theme";
import { T } from "../ui";

export const OTP_LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChangeText: (next: string) => void;
  /** Mã sai: cả 6 ô đổi viền danger. */
  invalid?: boolean;
  style?: ViewStyle;
}

/**
 * Sáu ô nhập mã OTP (SPEC §3.13).
 *
 * Thực chất là MỘT `TextInput` trong suốt phủ lên trên, không phải sáu ô riêng:
 * sáu ô riêng thì phím xoá phải tự nhảy ngược ô, dán mã 6 số từ SMS không vào
 * được, và `textContentType="oneTimeCode"` của iOS chỉ điền vào ô đầu. Một ô ẩn
 * giải quyết cả ba.
 */
export function OtpInput({ value, onChangeText, invalid, style }: OtpInputProps) {
  // RN 0.88 tách kiểu phần tử khỏi kiểu component: `useRef<TextInput>` trỏ vào
  // kiểu props chứ không phải instance, nên `.focus()` không tồn tại.
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const digits = value.padEnd(OTP_LENGTH).split("").slice(0, OTP_LENGTH);
  const cursor = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      accessibilityRole="button"
      accessibilityLabel={`Mã OTP, đã nhập ${value.length} trên ${OTP_LENGTH} số`}
      style={[styles.row, style]}
    >
      {digits.map((d, i) => {
        const filled = d.trim().length > 0;
        const active = !invalid && i === cursor && value.length < OTP_LENGTH;
        return (
          <View
            key={i}
            style={[
              styles.box,
              invalid ? styles.boxInvalid : active ? styles.boxActive : filled ? styles.boxFilled : styles.boxEmpty,
            ]}
          >
            {filled ? (
              <T style={styles.digit}>{d}</T>
            ) : active ? (
              <View style={styles.caret} />
            ) : null}
          </View>
        );
      })}

      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        autoFocus
        accessibilityLabel="Mã OTP"
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.x2 },
  box: {
    width: 48, height: 58, borderRadius: radius.thumb,
    alignItems: "center", justifyContent: "center", backgroundColor: color.paper,
  },
  boxEmpty: { borderWidth: 1, borderColor: color.line },
  boxFilled: { borderWidth: 1.5, borderColor: color.ink },
  boxActive: { borderWidth: 2, borderColor: color.brand },
  boxInvalid: { borderWidth: 1.5, borderColor: color.danger },
  digit: { ...text("title", { weight: "bold", tabular: true }), fontSize: 24, lineHeight: 30 },
  caret: { width: 2, height: 24, backgroundColor: color.brand, borderRadius: radius.pill },
  // Ô thật nằm đè toàn bộ hàng, trong suốt: chạm đâu cũng mở bàn phím.
  hidden: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0, color: "transparent",
  },
});

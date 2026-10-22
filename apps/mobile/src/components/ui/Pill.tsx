import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export type PillTone = "brand" | "ink" | "outline" | "paper";

export interface PillProps {
  label: string;
  onPress?: () => void;
  /** `brand` cam cho hành động chính · `ink` cho phụ quan trọng · `outline`/`paper` cho phụ thường. */
  tone?: PillTone;
  disabled?: boolean;
  /** Đang xử lý — hiện vòng xoay thay nhãn và chặn bấm tiếp. */
  loading?: boolean;
  /** Icon đặt trước nhãn. */
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  /** CHỈ dùng cho layout (flex, margin). Không ghi đè màu. */
  style?: ViewStyle;
}

/**
 * Nút viên thuốc cao 54 — nút chính của app.
 * Khác {@link IconButton}: Pill luôn có nhãn chữ; IconButton chỉ có icon.
 */
export function Pill({
  label, onPress, tone = "brand", disabled, loading, leading, accessibilityLabel, style,
}: PillProps) {
  const [down, setDown] = useState(false);
  const blocked = !!disabled || !!loading;

  const bg =
    tone === "brand" ? (down ? color.bqDeep : color.bq)
    : tone === "ink" ? color.ink
    : tone === "paper" ? color.paper
    : "transparent";

  const textTone = tone === "brand" || tone === "ink" ? "white" : "ink";

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: !!loading }}
      style={[
        styles.base,
        { backgroundColor: bg },
        tone === "outline" && styles.outline,
        tone === "paper" && styles.paperBorder,
        disabled && styles.disabled,
        down && styles.down,
        style,
      ]}
    >
      {loading ? (
        // Giữ nguyên nhãn trong accessibilityLabel ở trên: vòng xoay không có
        // chữ, trình đọc màn hình vẫn phải biết nút này là nút gì.
        <ActivityIndicator color={textTone === "white" ? color.white : color.ink} />
      ) : (
        <>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          {/* weight 600 + 15px là NGƯỠNG TỐI THIỂU để chữ trắng trên nền cam còn
              đọc được (3.56:1). Hạ xuống là vi phạm tương phản. */}
          <T variant="bodyStrong" weight="semibold" tone={textTone}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54, borderRadius: radius.pill, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: space.x2,
    paddingHorizontal: space.x6,
  },
  outline: { borderWidth: 1.5, borderColor: color.line },
  paperBorder: { borderWidth: 1, borderColor: color.line },
  disabled: { opacity: 0.4 },
  down: { transform: [{ scale: 0.98 }] },
  leading: { marginRight: space.x1 },
});

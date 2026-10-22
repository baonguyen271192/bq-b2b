import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export type PillTone = "brand" | "ink" | "outline" | "paper";

export interface PillProps {
  label: string;
  onPress?: () => void;
  /** `brand` hành động chính · `ink` phụ quan trọng · `outline` phụ thường ·
   *  `paper` khi nút nằm trên nền TỐI (splash). */
  tone?: PillTone;
  disabled?: boolean;
  /** Đang xử lý — hiện vòng xoay thay nhãn và chặn bấm tiếp. */
  loading?: boolean;
  /** Nhãn thay thế khi `loading` (vd "Đang gửi đơn…"). Bỏ trống thì chỉ hiện vòng xoay. */
  loadingLabel?: string;
  /** Icon đặt trước nhãn, cỡ 20. */
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  /** CHỈ dùng cho layout (flex, margin). Không ghi đè màu. */
  style?: ViewStyle;
}

/**
 * Nút viên thuốc cao 54 — nút chính của app (SPEC §2).
 *
 * Chữ trắng trên `brand` đạt 4.79:1 nên 16/600 ở đây dư an toàn. Trước đây token
 * cam sáng hơn và 15/600 là ngưỡng sát nút; đổi sang `brand` xong thì ràng buộc
 * đó không còn — nhưng vẫn giữ 600 vì nút mảnh chữ trông như chữ thường.
 *
 * Khác {@link IconButton}: Pill luôn có nhãn chữ; IconButton chỉ có icon.
 */
export function Pill({
  label, onPress, tone = "brand", disabled, loading, loadingLabel, leading,
  accessibilityLabel, style,
}: PillProps) {
  const [down, setDown] = useState(false);
  const blocked = !!disabled || !!loading;

  const bg =
    tone === "brand" ? (down ? color.brandDeep : color.brand)
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
        // Giữ nguyên nhãn gốc trong accessibilityLabel ở trên: vòng xoay không
        // có chữ, trình đọc màn hình vẫn phải biết nút này là nút gì.
        <>
          <ActivityIndicator color={textTone === "white" ? color.white : color.ink} />
          {loadingLabel ? (
            <T variant="cardTitle" weight="semibold" tone={textTone}>{loadingLabel}</T>
          ) : null}
        </>
      ) : (
        <>
          {leading}
          <T variant="cardTitle" weight="semibold" tone={textTone}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54, borderRadius: radius.pill, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
    // SPEC: icon 20 cách chữ 8.
    gap: space.x2,
    paddingHorizontal: 22,
  },
  /** SPEC: viền 1.5 INK (không phải `line`) — đây là nút, không phải ô nhập. */
  outline: { borderWidth: 1.5, borderColor: color.ink },
  paperBorder: { borderWidth: 1, borderColor: color.line },
  disabled: { opacity: 0.4 },
  /** SPEC §4: Pill và card nhấn xuống scale 0.98. */
  down: { transform: [{ scale: 0.98 }] },
});

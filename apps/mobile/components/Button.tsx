import * as Haptics from "expo-haptics";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, colors, radius, shadow, space } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: ViewStyle;
}

const SURFACE: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.brand[500] },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brand[500] },
  ghost: { backgroundColor: colors.surfaceSunken },
  danger: { backgroundColor: colors.danger.bg, borderWidth: 1, borderColor: colors.danger.border },
};

const INK: Record<Variant, string> = {
  primary: colors.textOnBrand,
  secondary: colors.brand[500],
  ghost: colors.slate[700],
  danger: colors.danger.fg,
};

export function Button({
  label, onPress, variant = "primary", size = "lg",
  icon, disabled, loading, full = true, style,
}: Props) {
  const inactive = disabled || loading;
  const height = size === "lg" ? 54 : 44;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        // Phản hồi rung ở hành động chính: trên điện thoại, người dùng cầm máy chứ
        // không nhìn con trỏ — xúc giác là tín hiệu "đã nhận" nhanh nhất.
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        SURFACE[variant],
        { height, alignSelf: full ? "stretch" : "flex-start" },
        variant === "primary" && !inactive ? shadow.brand : null,
        // Lún nhẹ thay vì đổi màu: giữ được tương phản chữ, hợp với mọi biến thể.
        pressed && !inactive ? styles.pressed : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={INK[variant]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={19} color={INK[variant]} /> : null}
          <Text variant="bodyLg" weight="700" color={INK[variant]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.92 },
  disabled: { opacity: 0.45 },
});

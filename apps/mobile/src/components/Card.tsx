import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, shadow, space } from "@/theme";

interface Props extends ViewProps {
  /** `flat` bỏ bóng đổ — dùng khi thẻ nằm trong thẻ khác, tránh bóng chồng bóng. */
  flat?: boolean;
  padded?: boolean;
}

export function Card({ flat, padded = true, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        padded ? { padding: space.lg } : null,
        flat ? styles.flat : shadow.card,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl },
  flat: { borderWidth: 1, borderColor: colors.border },
});

import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "@/theme";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  /** Chừa chỗ cho thanh hành động dán đáy màn hình. */
  footer?: ReactNode;
  style?: ViewStyle;
}

/**
 * Khung màn hình chuẩn: nền app, lề ngang, và chừa đúng vùng an toàn.
 *
 * Vùng an toàn phải lấy từ `useSafeAreaInsets` chứ không chốt cứng: tai thỏ của iPhone
 * và thanh điều hướng cử chỉ của Android cho số khác nhau, và còn đổi theo đời máy.
 */
export function Screen({ children, scroll = true, footer, style }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = (footer ? 0 : insets.bottom) + space.xl;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, { paddingBottom: bottomPad }, style]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

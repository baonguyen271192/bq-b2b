import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useDemoSignIn, useSession } from "@/lib/session";
import { Text, colors, radius, shadow, space } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, loading, error } = useSession();
  const demoSignIn = useDemoSignIn();
  const [phone, setPhone] = useState("912 345 468");

  if (dealer) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    // Backend chưa có OTP (docs/architecture.md §11). Nút này đăng nhập bằng đại lý
    // demo để luồng phía sau chạy thật — KHÔNG giả lập màn nhập mã rồi bỏ trống.
    try {
      await demoSignIn();
      router.replace("/(tabs)");
    } catch {
      // Lỗi đã nằm trong session.error, hiện ngay dưới ô nhập.
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.body, { paddingTop: insets.top + space["4xl"] }]}>
        <View style={styles.logo}>
          <Text variant="h2" color={colors.textOnBrand}>BQ</Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="h1">Đăng nhập đại lý</Text>
          <Text variant="body" color={colors.textMuted}>
            Nhập số điện thoại đã đăng ký với BQ để nhận mã OTP.
          </Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="label" color={colors.textMuted}>Số điện thoại</Text>
          <View style={styles.field}>
            <Text variant="bodyLg" weight="700">+84</Text>
            <View style={styles.divider} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              placeholder="912 345 678"
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Số điện thoại"
            />
          </View>
          {error ? (
            <Text variant="caption" color={colors.danger.fg}>{error}</Text>
          ) : null}
        </View>

        <Button label="Nhận mã OTP" onPress={submit} loading={loading} />

        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text variant="caption" color={colors.textFaint}>hoặc</Text>
          <View style={styles.line} />
        </View>

        <Button label="Kích hoạt từ lời mời của Sale" variant="secondary" onPress={submit} />
      </View>

      <Pressable style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}>
        <Text variant="bodySm" color={colors.textMuted}>
          Chưa là đại lý BQ? <Text variant="bodySm" weight="700" color={colors.brand[500]}>Đăng ký ngay</Text>
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, paddingHorizontal: space.xl, gap: space.xl },
  logo: {
    width: 64, height: 64, borderRadius: radius.lg,
    backgroundColor: colors.brand[500],
    alignItems: "center", justifyContent: "center",
    ...shadow.brand,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    height: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand[500],
    backgroundColor: colors.surface,
  },
  divider: { width: 1, height: 24, backgroundColor: colors.border },
  input: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 16, color: colors.text },
  orRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: "auto" },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  footer: { alignItems: "center", paddingTop: space.lg },
});

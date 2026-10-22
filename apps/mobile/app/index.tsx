import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDemoSignIn, useSession } from "@/lib/session";
import { color, radius, shadow, space } from "@/theme";
import { Pill, T, TextField } from "@/components/ui";

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
    // Backend chưa có OTP (docs/architecture.md §11). Nút này đăng nhập bằng đại
    // lý demo để luồng phía sau chạy thật — KHÔNG giả lập màn nhập mã rồi bỏ trống.
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
      <View style={[styles.body, { paddingTop: insets.top + space.x12 }]}>
        <View style={styles.logo}>
          <T variant="title" tone="white">BQ</T>
        </View>

        <View style={styles.intro}>
          <T variant="amountHero">Đăng nhập đại lý</T>
          <T variant="body" tone="muted">
            Nhập số điện thoại đã đăng ký với BQ để nhận mã OTP.
          </T>
        </View>

        <TextField
          label="Số điện thoại"
          prefix="+84"
          value={phone}
          onChangeText={setPhone}
          placeholder="912 345 678"
          keyboardType="phone-pad"
          error={error}
        />

        <Pill label="Nhận mã OTP" tone="brand" loading={loading} onPress={submit} />

        <View style={styles.orRow}>
          <View style={styles.line} />
          <T variant="chip" tone="muted">hoặc</T>
          <View style={styles.line} />
        </View>

        <Pill label="Kích hoạt từ lời mời của Sale" tone="outline" onPress={submit} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.x6 }]}>
        <T variant="small" tone="muted">
          Chưa là đại lý BQ? <T variant="small" weight="bold" tone="brand">Đăng ký ngay</T>
        </T>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  body: { flex: 1, paddingHorizontal: space.x6, gap: space.x6 },
  logo: {
    width: 64, height: 64, borderRadius: radius.field,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
    ...shadow.tabBar,
  },
  intro: { gap: space.x2 },
  // `marginTop: auto` đẩy cụm "hoặc" và nút phụ xuống đáy phần thân, nên ô nhập
  // luôn nằm ở tầm tay dù màn cao bao nhiêu.
  orRow: { flexDirection: "row", alignItems: "center", gap: space.x3, marginTop: "auto" },
  line: { flex: 1, height: 1, backgroundColor: color.line },
  footer: { alignItems: "center", paddingTop: space.x4 },
});

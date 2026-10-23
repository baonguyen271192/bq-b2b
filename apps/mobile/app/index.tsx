import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { Pill, T, TextButton, TextField } from "@/components/ui";

/**
 * Đăng nhập đại lý (SPEC §3.1, ảnh `01-Main.png`).
 *
 * Màn này KHÔNG tự đăng nhập: nó chỉ nhận số điện thoại rồi chuyển sang màn nhập
 * mã. Backend chưa có OTP (`docs/architecture.md` §11) nên việc đổi mã lấy phiên
 * nằm ở `app/otp.tsx`, đúng một chỗ, để khi có API thật chỉ phải sửa ở đó.
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, restoring } = useSession();
  const [phone, setPhone] = useState("912 345 468");

  // Chưa đọc xong phiên đã lưu thì chưa vẽ gì: hiện màn đăng nhập rồi nhảy sang
  // Trang chủ ngay sau đó là một cú nháy vô cớ.
  if (restoring) return null;
  if (dealer) return <Redirect href="/(tabs)" />;

  const digits = phone.replace(/\D/g, "");
  const invalid = digits.length > 0 && digits.length < 9;

  const requestCode = () => {
    if (digits.length < 9) return;
    router.push({ pathname: "/otp", params: { phone: digits } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader />

        <View style={styles.body}>
          <View style={styles.intro}>
            <T variant="screenTitle">Đăng nhập đại lý</T>
            <T variant="body" tone="muted">
              Nhập số điện thoại đã đăng ký với BQ để nhận mã OTP.
            </T>
          </View>

          <TextField
            variant="strong"
            label="Số điện thoại"
            prefix="+84"
            value={phone}
            onChangeText={setPhone}
            placeholder="912 345 678"
            keyboardType="phone-pad"
            hint="Mã OTP có hiệu lực trong 5 phút."
            error={invalid ? "Số điện thoại phải có ít nhất 9 chữ số." : null}
          />

          <Pill label="Nhận mã OTP" onPress={requestCode} disabled={digits.length < 9} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 34 }]}>
        {/* TODO(api): chưa có endpoint đổi lời mời của Sale lấy phiên. Tạm đi
            chung luồng OTP vì lời mời cũng gửi mã qua SMS. */}
        <Pill
          label="Kích hoạt từ lời mời của Sale"
          tone="outline"
          onPress={requestCode}
          leading={<Ionicons name="shield-checkmark-outline" size={20} color={color.ink} />}
        />
        <View style={styles.signUp}>
          <T variant="small" tone="muted">Chưa là đại lý BQ? </T>
          <TextButton label="Đăng ký ngay" tone="brand" onPress={() => router.push("/register")} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  scroll: { flexGrow: 1 },
  body: { paddingHorizontal: space.screen, paddingTop: space.x8, gap: space.x5 },
  intro: { gap: space.x2 },
  footer: {
    paddingHorizontal: space.screen, paddingTop: space.x4,
    gap: space.x3, alignItems: "stretch",
  },
  signUp: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
});

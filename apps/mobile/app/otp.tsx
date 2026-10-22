import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDemoSignIn } from "@/lib/session";
import { color, space } from "@/theme";
import { OtpInput, OTP_LENGTH } from "@/components/auth/OtpInput";
import { Notice, Pill, ScreenHeader, T, TextButton } from "@/components/ui";

/** Đếm ngược trước khi được gửi lại mã, tính bằng giây. */
const RESEND_SECONDS = 60;
/** Số lần nhập sai trước khi phải quay lại xin mã mới. */
const MAX_ATTEMPTS = 5;

/** 912345468 -> "+84 912 345 468" */
function formatPhone(digits: string): string {
  const g = digits.replace(/\D/g, "");
  return `+84 ${g.slice(0, 3)} ${g.slice(3, 6)} ${g.slice(6)}`.trimEnd();
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Nhập mã OTP (SPEC §3.13, ảnh `13-OTP.png`).
 *
 * TODO(api): backend chưa có xác thực OTP (`docs/architecture.md` §11). Màn này
 * đổi mã lấy phiên bằng `useDemoSignIn()`, và đó là CHỖ DUY NHẤT trong app làm
 * việc đó — khi có `POST /api/auth/otp` thật thì chỉ sửa hàm `verify` dưới đây.
 * Mã demo: 6 chữ số bất kỳ đều được chấp nhận.
 */
export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const demoSignIn = useDemoSignIn();
  const { phone } = useLocalSearchParams<{ phone?: string }>();

  const [code, setCode] = useState("");
  const [left, setLeft] = useState(RESEND_SECONDS);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Chặn lần gửi thứ hai khi `useEffect` chạy lại trong lúc đang gửi. */
  const sending = useRef(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      await demoSignIn();
      router.replace("/(tabs)");
    } catch {
      setInvalid(true);
      setAttemptsLeft((n) => Math.max(0, n - 1));
      setCode("");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }, [demoSignIn, router]);

  /**
   * SPEC: đủ 6 số thì TỰ gửi. Người dùng vừa gõ xong số cuối là xong việc, bắt
   * bấm thêm một nút nữa chỉ để xác nhận điều họ vừa làm là thừa.
   *
   * Gửi ngay trong handler chứ KHÔNG qua `useEffect`: đây là phản ứng với một
   * thao tác của người dùng, không phải đồng bộ state với hệ thống bên ngoài.
   */
  const onChange = (next: string) => {
    setInvalid(false);
    setCode(next);
    if (next.length === OTP_LENGTH) void verify();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.body, { paddingTop: insets.top + space.x3 }]}>
        <ScreenHeader variant="back" title="Nhập mã OTP" onBack={() => router.back()} />

        <View style={styles.intro}>
          <T variant="body" tone="muted">
            {`Mã ${OTP_LENGTH} số đã gửi qua SMS tới `}
            <T variant="body" weight="bold">{formatPhone(phone ?? "")}</T>
            .
          </T>
          <TextButton label="Đổi số" tone="brand" onPress={() => router.back()} />
        </View>

        <OtpInput value={code} onChangeText={onChange} invalid={invalid} />

        {invalid ? (
          <T variant="small" tone="danger">
            {attemptsLeft > 0
              ? `Mã không đúng, còn ${attemptsLeft} lần thử.`
              : "Hết lượt thử. Bấm Gửi lại để nhận mã mới."}
          </T>
        ) : null}

        <View style={styles.resend}>
          <T variant="label" weight="regular" tone="muted">
            {left > 0 ? `Gửi lại mã sau ${mmss(left)}` : "Chưa nhận được mã?"}
          </T>
          <TextButton
            label="Gửi lại"
            tone="brand"
            disabled={left > 0}
            onPress={() => {
              setLeft(RESEND_SECONDS);
              setAttemptsLeft(MAX_ATTEMPTS);
              onChange("");
            }}
          />
        </View>

        <Pill
          label="Xác nhận"
          onPress={verify}
          loading={busy}
          disabled={code.length < OTP_LENGTH}
        />

        <Notice kind="plain">
          Không nhận được mã? Gọi Sale phụ trách hoặc tổng đài BQ để được hỗ trợ kích hoạt.
        </Notice>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  body: { flex: 1, paddingHorizontal: space.screen, gap: space.x5 },
  intro: { gap: space.x1, alignItems: "flex-start" },
  resend: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

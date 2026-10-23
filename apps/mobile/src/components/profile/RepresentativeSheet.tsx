import { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { prettyPhone, SUPPORT_HOTLINE, telUrl } from "@/lib/support";
import { space } from "@/theme";
import { BottomSheet, Pill, T, TextButton, TextField } from "../ui";

export interface RepresentativeSheetProps {
  visible: boolean;
  onClose: () => void;
  owner: string;
  /** Số đăng nhập — CHỈ ĐỌC. */
  phone: string;
  email?: string;
  onSave: (draft: { owner: string; email?: string }) => Promise<void>;
}

/**
 * Sheet "Thông tin đại diện" (SPEC §5-N.7) — cùng khuôn với `AddressForm`:
 * thân cuộn được, nút lưu dán đáy nên luôn ở trên bàn phím.
 */
export function RepresentativeSheet(props: RepresentativeSheetProps) {
  if (!props.visible) return null;
  return <Body key={`${props.owner}|${props.email ?? ""}`} {...props} />;
}

function Body({ onClose, owner, phone, email, onSave }: RepresentativeSheetProps) {
  const [name, setName] = useState(owner);
  const [mail, setMail] = useState(email ?? "");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const hotline = SUPPORT_HOTLINE;

  const nameError = !name.trim() ? "Nhập họ tên người đại diện." : null;
  const mailError = mail.trim() && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(mail.trim())
    ? "Email chưa đúng định dạng."
    : null;
  const valid = !nameError && !mailError;

  const save = async () => {
    setTouched(true);
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ owner: name.trim(), email: mail.trim() || undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible tall onClose={onClose} title="Thông tin đại diện">
      <View style={styles.fill}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="Họ tên người đại diện"
            value={name}
            onChangeText={setName}
            placeholder="Họ và tên"
            error={touched ? nameError : null}
          />

          {/*
            Số đăng nhập CHỈ ĐỌC (SPEC §5-N.7): đây là định danh tài khoản OTP,
            đổi nó là đổi tài khoản. Hiện ra kèm lối đi thay vì giấu đi — đại lý
            cần thấy app đang biết số nào.
          */}
          <View style={styles.readonly}>
            <T variant="label" weight="semibold">Số điện thoại đăng nhập</T>
            <T variant="body">{prettyPhone(phone)}</T>
            {hotline ? (
              <View style={styles.hintRow}>
                <T variant="small" tone="muted">Đổi số đăng nhập: </T>
                <TextButton
                  label="gọi tổng đài BQ"
                  onPress={() => void Linking.openURL(telUrl(hotline))}
                />
              </View>
            ) : (
              <T variant="small" tone="muted">Đổi số đăng nhập: liên hệ BQ.</T>
            )}
          </View>

          <TextField
            label="Email"
            value={mail}
            onChangeText={setMail}
            placeholder="Để BQ gửi hoá đơn, chứng từ"
            keyboardType="email-address"
            error={touched ? mailError : null}
          />
        </ScrollView>

        <View style={styles.foot}>
          <Pill label="Lưu thay đổi" loading={saving} onPress={save} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { gap: space.x4, paddingBottom: space.x4 },
  readonly: { gap: space.x1 },
  hintRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  foot: { paddingTop: space.x3 },
});

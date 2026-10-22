import { useState } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space } from "@/theme";
import { StepBar } from "@/components/auth/StepBar";
import {
  DashedButton, Dock, DOCK_CLEARANCE_ACTIONS, EmptyState, Pill, ScreenHeader, Select,
  Switch, T, TextField,
} from "@/components/ui";

/** Tối đa 3 ảnh giấy phép kinh doanh (SPEC §3.19). */
const MAX_LICENSE_PHOTOS = 3;

/**
 * TODO(api): chưa có endpoint đơn vị hành chính (xem
 * `docs/sap-b1-mapping-proposal.md` A6: `GET /api/geo/provinces`). Danh sách dưới
 * đây là MOCK vài mục để dựng giao diện — không phải danh sách chính thức, và cố
 * ý để ngắn để không ai nhầm là đủ.
 */
const MOCK_PROVINCES = [
  { value: "48", label: "Đà Nẵng" },
  { value: "49", label: "Quảng Nam" },
  { value: "79", label: "TP. Hồ Chí Minh" },
  { value: "01", label: "Hà Nội" },
];

/** TODO(api): phường/xã phải lấy theo tỉnh đã chọn. */
const MOCK_WARDS: Record<string, { value: string; label: string }[]> = {
  "48": [
    { value: "20194", label: "Phường Thanh Khê" },
    { value: "20212", label: "Phường Hải Châu" },
  ],
  "49": [
    { value: "20350", label: "Phường Cẩm Châu" },
    { value: "20353", label: "Phường Hội An" },
  ],
};

interface Form {
  business: string;
  taxCode: string;
  owner: string;
  phone: string;
  province?: string;
  ward?: string;
  street: string;
  sameAsBusiness: boolean;
}

const EMPTY: Form = {
  business: "", taxCode: "", owner: "", phone: "",
  street: "", sameAsBusiness: true,
};

/**
 * Đăng ký đại lý, hai bước (SPEC §3.19, ảnh `19-Register.png`).
 *
 * TODO(api): chưa có `POST /api/dealers/register`. Bấm "Gửi đăng ký" chỉ chuyển
 * sang màn xác nhận; không có gì được gửi đi. Giữ nguyên dữ liệu đã nhập trong
 * state để khi có API thì chỉ cần thay thân hàm `submit`.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState(0);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const errors = {
    business: !form.business.trim() ? "Nhập tên doanh nghiệp hoặc hộ kinh doanh." : null,
    taxCode: !/^\d{10}(\d{3})?$/.test(form.taxCode.replace(/\s/g, ""))
      ? "Mã số thuế phải có 10 hoặc 13 chữ số." : null,
    owner: !form.owner.trim() ? "Nhập họ tên người đại diện." : null,
    phone: form.phone.replace(/\D/g, "").length < 9 ? "Số điện thoại phải có ít nhất 9 chữ số." : null,
  };
  const step1Ok = Object.values(errors).every((e) => e === null);
  const step2Ok = !!form.province && !!form.ward && !!form.street.trim();

  const advance = () => {
    setTouched(true);
    if (step === 1) {
      if (step1Ok) { setStep(2); setTouched(false); }
      return;
    }
    if (step2Ok) submit();
  };

  const submit = () => {
    // TODO(api): gửi `form` lên `POST /api/dealers/register` khi có endpoint.
    setSent(true);
  };

  if (sent) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.x3 }]}>
        <View style={styles.pad}>
          <ScreenHeader variant="back" title="Đăng ký đại lý" onBack={() => router.replace("/")} />
        </View>
        <View style={styles.center}>
          <EmptyState
            icon="checkmark-circle-outline"
            title="Đã gửi đăng ký"
            hint="Sale BQ sẽ liên hệ để xác minh thông tin trong 1–2 ngày làm việc."
            actionLabel="Về màn đăng nhập"
            onActionPress={() => router.replace("/")}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: DOCK_CLEARANCE_ACTIONS + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          variant="back"
          title="Đăng ký đại lý"
          caption={step === 1 ? "Bước 1/2: Thông tin doanh nghiệp" : "Bước 2/2: Địa chỉ"}
          onBack={() => (step === 1 ? router.back() : setStep(1))}
        />
        <StepBar current={step} total={2} />

        {step === 1 ? (
          <>
            <TextField
              label="Tên doanh nghiệp hoặc hộ kinh doanh"
              value={form.business}
              onChangeText={(v) => set("business", v)}
              placeholder="Ví dụ: Cửa hàng Giày Minh Phát"
              error={touched ? errors.business : null}
            />
            <TextField
              label="Mã số thuế"
              value={form.taxCode}
              onChangeText={(v) => set("taxCode", v)}
              placeholder="10 hoặc 13 chữ số"
              keyboardType="number-pad"
              error={touched ? errors.taxCode : null}
            />
            <TextField
              label="Người đại diện"
              value={form.owner}
              onChangeText={(v) => set("owner", v)}
              placeholder="Họ và tên"
              error={touched ? errors.owner : null}
            />
            <TextField
              label="Số điện thoại"
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
              placeholder="09xx xxx xxx"
              keyboardType="phone-pad"
              hint="Dùng số này để đăng nhập bằng OTP"
              error={touched ? errors.phone : null}
            />

            <View style={styles.photos}>
              <View style={styles.photosHead}>
                <T variant="label" weight="semibold">Giấy phép kinh doanh</T>
                <T variant="small" tone="muted">{`Tối đa ${MAX_LICENSE_PHOTOS} ảnh`}</T>
              </View>
              <View style={styles.photoRow}>
                {Array.from({ length: photos }, (_, i) => (
                  <View key={i} style={styles.photo}>
                    <T variant="chip" tone="muted">{`Ảnh ${i + 1}`}</T>
                  </View>
                ))}
                {photos < MAX_LICENSE_PHOTOS ? (
                  // TODO(api): chưa có expo-image-picker và chưa có endpoint tải
                  // ảnh lên. Nút này mới chỉ thêm ô giữ chỗ.
                  <DashedButton
                    label="Thêm ảnh"
                    shape="tile"
                    icon="add"
                    onPress={() => setPhotos((n) => n + 1)}
                  />
                ) : null}
              </View>
            </View>
          </>
        ) : (
          <>
            <Select
              label="Tỉnh / Thành phố"
              placeholder="Chọn tỉnh, thành phố"
              options={MOCK_PROVINCES}
              value={form.province}
              onChange={(v) => setForm((f) => ({ ...f, province: v, ward: undefined }))}
            />
            <Select
              label="Phường / Xã"
              placeholder="Chọn phường, xã"
              options={form.province ? (MOCK_WARDS[form.province] ?? []) : []}
              value={form.ward}
              onChange={(v) => set("ward", v)}
              disabled={!form.province}
              disabledHint="Chọn tỉnh, thành phố trước"
            />
            <TextField
              label="Số nhà, tên đường"
              value={form.street}
              onChangeText={(v) => set("street", v)}
              placeholder="Ví dụ: 210 Cửa Đại"
              error={touched && !form.street.trim() ? "Nhập số nhà và tên đường." : null}
            />
            <View style={styles.sameRow}>
              <View style={styles.sameText}>
                <T variant="bodyStrong" weight="semibold">Giao hàng về địa chỉ này</T>
                <T variant="small" tone="muted">
                  Tắt nếu kho nhận hàng khác địa chỉ kinh doanh. Thêm được nhiều địa
                  chỉ sau khi đăng ký.
                </T>
              </View>
              <Switch
                value={form.sameAsBusiness}
                onValueChange={(v) => set("sameAsBusiness", v)}
                accessibilityLabel="Giao hàng về địa chỉ kinh doanh"
              />
            </View>
          </>
        )}
      </ScrollView>

      <Dock>
        <Pill
          label={step === 1 ? "Tiếp tục" : "Gửi đăng ký"}
          onPress={advance}
          style={styles.flex}
        />
      </Dock>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x4 },
  pad: { paddingHorizontal: space.screen },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: space.screen },
  photos: { gap: space.x2 },
  photosHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  photoRow: { flexDirection: "row", gap: space.x3, flexWrap: "wrap" },
  photo: {
    width: 96, height: 96, borderRadius: radius.field, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
  sameRow: { flexDirection: "row", alignItems: "center", gap: space.x4 },
  sameText: { flex: 1, gap: 2 },
  flex: { flex: 1 },
});

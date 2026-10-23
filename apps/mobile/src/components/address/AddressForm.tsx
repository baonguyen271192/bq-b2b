import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { geoRepository } from "@/lib/repo/geo";
import {
  Pill, Select, Switch, T, TextField, type Address, type SelectOption,
} from "../ui";

export interface AddressFormProps {
  /** Địa chỉ đang sửa. Bỏ trống = thêm mới. */
  editing?: Address | null;
  onCreate: (draft: Omit<Address, "id">) => Promise<void>;
  onUpdate?: (address: Address) => Promise<void>;
  /** Bỏ trống thì không hiện nút xoá (SPEC §3.32). */
  onDelete?: (address: Address) => Promise<void>;
}

interface FormState {
  label: string;
  recipient: string;
  phone: string;
  province?: string;
  ward?: string;
  street: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = {
  label: "", recipient: "", phone: "", street: "", isDefault: false,
};

/**
 * Biểu mẫu địa chỉ (SPEC §3.25 và §3.32) — DÙNG CHUNG cho Thêm và Sửa.
 *
 * Tách khỏi `AddressSheet` vì hai luồng vào khác nhau (sheet "Giao đến" ở Giỏ
 * hàng, và nút "Sửa" ở Sổ địa chỉ) nhưng thân biểu mẫu phải giống hệt — kể cả
 * luật kiểm tra và cặp Select Tỉnh/Phường phụ thuộc nhau. Để hai bản là bảo đảm
 * chúng lệch nhau sau vài lần sửa.
 *
 * Form TỰ dựng nút lưu ở đáy, không dùng slot `footer` của sheet: trạng thái
 * `saving` và `valid` chỉ form biết, mà nút thì phải nằm ngoài vùng cuộn để
 * luôn ở trên bàn phím (SPEC §5-M).
 */
export function AddressForm({ editing, onCreate, onUpdate, onDelete }: AddressFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
        label: editing.label,
        recipient: editing.recipient,
        phone: editing.phone,
        street: editing.street,
        isDefault: !!editing.isDefault,
        province: editing.provinceCode,
        ward: editing.wardCode,
      }
      : EMPTY_FORM,
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<SelectOption[]>([]);
  /**
   * Phường/xã theo từng tỉnh, giữ dạng CACHE rồi suy ra danh sách đang dùng.
   *
   * Cách cũ là một state `wards` và effect gọi `setWards([])` khi chưa chọn
   * tỉnh — tức setState đồng bộ trong effect, thứ React 19 chặn. Cache thì chỉ
   * ghi trong callback bất đồng bộ, còn danh sách hiện tại là giá trị dẫn xuất.
   */
  const [wardCache, setWardCache] = useState<Record<string, SelectOption[]>>({});
  const wards = form.province ? (wardCache[form.province] ?? []) : [];

  useEffect(() => { void geoRepository.provinces().then(setProvinces); }, []);
  useEffect(() => {
    const code = form.province;
    if (!code || wardCache[code]) return;
    let alive = true;
    void geoRepository.wards(code).then((rows) => {
      if (alive) setWardCache((prev) => ({ ...prev, [code]: rows }));
    });
    return () => { alive = false; };
  }, [form.province, wardCache]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const errors = {
    label: !form.label.trim() ? "Đặt một tên để dễ nhận ra, vd “Kho Hội An”." : null,
    recipient: !form.recipient.trim() ? "Nhập tên người nhận." : null,
    phone: form.phone.replace(/\D/g, "").length < 9 ? "Số điện thoại phải có ít nhất 9 chữ số." : null,
    province: !form.province ? "Chọn tỉnh, thành phố." : null,
    ward: !form.ward ? "Chọn phường, xã." : null,
    street: !form.street.trim() ? "Nhập số nhà và tên đường." : null,
  };
  const valid = Object.values(errors).every((e) => e === null);

  const save = async () => {
    setTouched(true);
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        recipient: form.recipient.trim(),
        phone: form.phone.trim(),
        province: provinces.find((p) => p.value === form.province)?.label ?? "",
        provinceCode: form.province,
        ward: wards.find((w) => w.value === form.ward)?.label,
        wardCode: form.ward,
        street: form.street.trim(),
        isDefault: form.isDefault,
      };
      if (editing && onUpdate) await onUpdate({ ...payload, id: editing.id });
      else await onCreate(payload);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing || !onDelete) return;
    Alert.alert(
      "Xoá địa chỉ này?",
      `"${editing.label}" sẽ bị xoá khỏi sổ địa chỉ. Đơn cũ đã giao tới địa chỉ này vẫn giữ nguyên thông tin.`,
      [
        { text: "Giữ lại", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: () => { void onDelete(editing); } },
      ],
    );
  };

  return (
    <View style={styles.fill}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Tên gợi nhớ"
          value={form.label}
          onChangeText={(v) => set("label", v)}
          placeholder="Ví dụ: Kho Hội An, Cửa hàng chính"
          error={touched ? errors.label : null}
        />
        <View style={styles.two}>
          <TextField
            label="Người nhận"
            value={form.recipient}
            onChangeText={(v) => set("recipient", v)}
            placeholder="Họ và tên"
            error={touched ? errors.recipient : null}
            style={styles.col}
          />
          <TextField
            label="Số điện thoại"
            value={form.phone}
            onChangeText={(v) => set("phone", v)}
            placeholder="09xx xxx xxx"
            keyboardType="phone-pad"
            error={touched ? errors.phone : null}
            style={styles.col}
          />
        </View>
        {/* Tỉnh/TP và Phường/Xã CÙNG MỘT HÀNG hai cột (SPEC §3.32). */}
        <View style={styles.two}>
          <Select
            label="Tỉnh / Thành phố"
            placeholder="Chọn tỉnh"
            options={provinces}
            value={form.province}
            onChange={(v) => setForm((f) => ({ ...f, province: v, ward: undefined }))}
            style={styles.col}
          />
          <Select
            label="Phường / Xã"
            placeholder="Chọn phường, xã"
            options={wards}
            value={form.ward}
            onChange={(v) => set("ward", v)}
            disabled={!form.province}
            disabledHint="Chọn tỉnh, thành phố trước"
            style={styles.col}
          />
        </View>
        <TextField
          label="Số nhà, tên đường"
          value={form.street}
          onChangeText={(v) => set("street", v)}
          placeholder="Ví dụ: 210 Cửa Đại"
          error={touched ? errors.street : null}
        />
        <View style={styles.defaultRow}>
          <T variant="label" weight="semibold">Đặt làm địa chỉ mặc định</T>
          <Switch
            value={form.isDefault}
            onValueChange={(v) => set("isDefault", v)}
            accessibilityLabel="Đặt làm địa chỉ mặc định"
          />
        </View>

        {/* Xoá chỉ có khi ĐANG SỬA một địa chỉ đã lưu. Địa chỉ mặc định không
            xoá được: xoá nó xong thì đơn kế tiếp không biết giao đi đâu, nên
            bắt chọn địa chỉ khác làm mặc định trước. */}
        {editing && onDelete ? (
          <View style={styles.deleteBox}>
            <Pill
              label="Xoá địa chỉ này"
              tone="dangerOutline"
              disabled={!!editing.isDefault}
              leading={
                <Ionicons
                  name="close"
                  size={20}
                  color={editing.isDefault ? color.muted : color.danger}
                />
              }
              onPress={confirmDelete}
            />
            <T variant="small" tone="muted">
              {editing.isDefault
                ? "Địa chỉ mặc định không xoá được: hãy đặt địa chỉ khác làm mặc định trước."
                : "Đơn cũ đã giao tới địa chỉ này vẫn giữ nguyên thông tin."}
            </T>
          </View>
        ) : null}
      </ScrollView>

      {/* NGOÀI vùng cuộn: nút lưu phải luôn thấy được, kể cả khi bàn phím che
          nửa dưới màn (SPEC §5-M). */}
      <View style={styles.foot}>
        <Pill
          label={editing ? "Lưu thay đổi" : "Lưu và giao đến đây"}
          loading={saving}
          onPress={save}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { gap: space.x4, paddingBottom: space.x4 },
  two: { flexDirection: "row", gap: space.x3 },
  col: { flex: 1 },
  defaultRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x3, backgroundColor: color.paper, borderRadius: radius.field, padding: space.x4,
  },
  deleteBox: { gap: space.x2, marginTop: space.x2 },
  foot: {
    paddingTop: space.x3,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line,
  },
});

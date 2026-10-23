import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { geoRepository } from "@/lib/repo/geo";
import {
  AddressCard, BottomSheet, DashedButton, IconButton, Pill, RadioCard, Select, Switch, T,
  TextField, type Address, type SelectOption,
} from "../ui";

export interface AddressSheetProps {
  visible: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Lưu địa chỉ mới rồi chọn luôn cho đơn hiện tại. */
  onCreate: (draft: Omit<Address, "id">) => Promise<void>;
  /** Mở thẳng bước form — dùng khi đại lý chưa có địa chỉ nào (SPEC §3.24). */
  startOnForm?: boolean;
  /** Địa chỉ đang sửa. Có giá trị thì form điền sẵn và lưu bằng `onUpdate`. */
  editing?: Address | null;
  onUpdate?: (address: Address) => Promise<void>;
  /** Xoá địa chỉ đang sửa (SPEC §3.32). Bỏ trống thì không hiện nút xoá. */
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
 * Sheet chọn / thêm địa chỉ giao hàng (SPEC §3.24 và §3.25) — hai BƯỚC trong
 * CÙNG một sheet, không rời màn Giỏ hàng.
 *
 * Chạm một địa chỉ là chọn và đóng ngay, không có nút xác nhận: chọn địa chỉ là
 * hành động một bước, thêm một nút "Xong" chỉ bắt người dùng xác nhận lại điều
 * họ vừa làm.
 */
/**
 * Mỗi lần mở là một PHIÊN mới: dựng lại thân sheet bằng `key` thay vì dùng
 * effect gọi setState để dọn form. Remount nói đúng ý "đây là phiên khác", và
 * tránh nhánh setState-trong-effect mà lint React 19 chặn.
 */
export function AddressSheet(props: AddressSheetProps) {
  if (!props.visible) return null;
  return <AddressSheetBody key={props.editing?.id ?? "new"} {...props} />;
}

function AddressSheetBody({
  onClose, addresses, selectedId, onSelect, onCreate, startOnForm,
  editing, onUpdate, onDelete,
}: AddressSheetProps) {
  const [step, setStep] = useState<"list" | "form">(
    startOnForm || editing ? "form" : "list",
  );
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

  if (step === "form") {
    return (
      <BottomSheet
        visible
        onClose={onClose}
        header={
          <View style={styles.formHead}>
            {addresses.length > 0 && !editing ? (
              <IconButton
                icon="chevron-back"
                accessibilityLabel="Về danh sách địa chỉ"
                onPress={() => setStep("list")}
              />
            ) : null}
            <T variant="title">{editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</T>
          </View>
        }
        footer={
          <Pill
            label={editing ? "Lưu thay đổi" : "Lưu và giao đến đây"}
            loading={saving}
            onPress={save}
          />
        }
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.formBody}>
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
            <Select
              label="Tỉnh / Thành phố"
              placeholder="Chọn tỉnh, thành phố"
              options={provinces}
              value={form.province}
              onChange={(v) => setForm((f) => ({ ...f, province: v, ward: undefined }))}
            />
            <Select
              label="Phường / Xã"
              placeholder="Chọn phường, xã"
              options={wards}
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

            {/* Xoá chỉ có khi ĐANG SỬA một địa chỉ đã lưu. Địa chỉ mặc định
                không xoá được: xoá nó xong thì đơn kế tiếp không biết giao đi
                đâu, nên bắt chọn địa chỉ khác làm mặc định trước. */}
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
                  onPress={() => {
                    Alert.alert(
                      "Xoá địa chỉ này?",
                      `"${editing.label}" sẽ bị xoá khỏi sổ địa chỉ. Đơn cũ đã giao tới địa chỉ này vẫn giữ nguyên thông tin.`,
                      [
                        { text: "Giữ lại", style: "cancel" },
                        {
                          text: "Xoá",
                          style: "destructive",
                          onPress: () => { void onDelete(editing); },
                        },
                      ],
                    );
                  }}
                />
                <T variant="small" tone="muted">
                  {editing.isDefault
                    ? "Địa chỉ mặc định không xoá được: hãy đặt địa chỉ khác làm mặc định trước."
                    : "Đơn cũ đã giao tới địa chỉ này vẫn giữ nguyên thông tin."}
                </T>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible onClose={onClose} title="Giao đến">
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.listBody}>
          {addresses.map((a) => (
            <RadioCard
              key={a.id}
              selected={a.id === selectedId}
              accessibilityLabel={`Giao đến ${a.label}`}
              onPress={() => { onSelect(a.id); onClose(); }}
            >
              <AddressCard address={a} variant="select" />
            </RadioCard>
          ))}

          <DashedButton label="Thêm địa chỉ mới" onPress={() => setStep("form")} />

          <T variant="small" tone="muted" style={styles.note}>
            Sửa hoặc xoá địa chỉ ở Hồ sơ › Sổ địa chỉ.
          </T>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  formHead: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.x3 },
  form: { maxHeight: 460 },
  formBody: { gap: space.x4, paddingBottom: space.x4 },
  two: { flexDirection: "row", gap: space.x3 },
  col: { flex: 1 },
  deleteBox: { gap: space.x2, marginTop: space.x2 },
  defaultRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x3, backgroundColor: color.paper, borderRadius: radius.field, padding: space.x4,
  },
  list: { maxHeight: 520 },
  listBody: { gap: space.x3, paddingBottom: space.x5 },
  note: { textAlign: "center", paddingHorizontal: space.x4 },
});

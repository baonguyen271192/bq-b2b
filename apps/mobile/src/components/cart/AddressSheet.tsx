import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { AddressForm } from "../address/AddressForm";
import {
  AddressCard, BottomSheet, DashedButton, IconButton, RadioCard, T, type Address,
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

/**
 * Sheet chọn / thêm / sửa địa chỉ giao hàng (SPEC §3.24, §3.25, §3.32) — mọi
 * bước nằm trong CÙNG một sheet, không rời màn đang đứng.
 *
 * Chạm một địa chỉ là chọn và đóng ngay, không có nút xác nhận: chọn địa chỉ là
 * hành động một bước, thêm một nút "Xong" chỉ bắt người dùng xác nhận lại điều
 * họ vừa làm.
 *
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

  if (step === "form") {
    return (
      <BottomSheet
        visible
        tall
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
      >
        <AddressForm
          editing={editing}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
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
  list: { maxHeight: 520 },
  listBody: { gap: space.x3, paddingBottom: space.x5 },
  note: { textAlign: "center", paddingHorizontal: space.x4 },
});

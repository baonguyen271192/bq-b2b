import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { Pill } from "./Pill";
import { StatusTag } from "./StatusTag";
import { T } from "./T";
import { TextButton } from "./TextButton";

/**
 * Một địa chỉ nhận hàng của đại lý.
 *
 * ĐÂY LÀ NƠI ĐẠI LÝ NHẬN HÀNG, không phải kho xuất của BQ (SPEC mục 5.H). Kho
 * xuất do backend cấu hình và không bao giờ hiện trên app đại lý.
 *
 * Kiểu này tạm đặt ở component vì API sổ địa chỉ chưa có — xem
 * `docs/sap-b1-mapping-proposal.md` A4. Khi có repository ở Phase 4 thì chuyển
 * lên đó và component import xuống.
 */
export interface Address {
  id: string;
  /** Tên gợi nhớ: "Kho Hội An", "Cửa hàng Hải Châu". */
  label: string;
  recipient: string;
  phone: string;
  /** Số nhà, tên đường. */
  street: string;
  /** Phường/Xã — hành chính 2 cấp, không còn cấp huyện. */
  ward?: string;
  /** Tỉnh/Thành phố. */
  province: string;
  /**
   * Mã đơn vị hành chính. Giữ cùng TÊN chứ không thay thế: tên để hiện, mã để
   * điền lại form và để gửi lên API (`docs/sap-b1-mapping-proposal.md` A6).
   */
  provinceCode?: string;
  wardCode?: string;
  isDefault?: boolean;
}

/** Ghép dòng địa chỉ, bỏ phần rỗng để không ra ", , Đà Nẵng". */
export function formatAddress(a: Address): string {
  return [a.street, a.ward, a.province].filter(Boolean).join(", ");
}

export interface AddressCardProps {
  address: Address;
  /**
   * `manage` — trong Sổ địa chỉ: có nút Sửa và link Đặt mặc định.
   * `select` — trong sheet chọn: chỉ nội dung, phần chọn do `RadioCard` bọc ngoài.
   */
  variant?: "manage" | "select";
  onEdit?: () => void;
  onSetDefault?: () => void;
  style?: ViewStyle;
}

/**
 * Thẻ địa chỉ (SPEC §2), dùng chung cho `23-Addresses` và sheet `24-AddressSheet`.
 *
 * Biến thể `select` KHÔNG tự vẽ khung: nó nằm trong `RadioCard` nên vẽ thêm
 * viền nữa sẽ thành hai khung lồng nhau.
 */
export function AddressCard({
  address, variant = "manage", onEdit, onSetDefault, style,
}: AddressCardProps) {
  const manage = variant === "manage";
  const body = (
    <>
      <View style={styles.head}>
        <T variant={manage ? "cardTitle" : "bodyStrong"} weight="bold" style={styles.name}>
          {address.label}
        </T>
        {address.isDefault ? <StatusTag label="Mặc định" kind="brand" /> : null}
      </View>
      <T variant="label" weight="regular">{`${address.recipient}, ${address.phone}`}</T>
      <T variant="small" tone="muted">{formatAddress(address)}</T>
    </>
  );

  if (!manage) return <View style={[styles.selectBody, style]}>{body}</View>;

  return (
    <View style={[styles.card, address.isDefault && styles.cardDefault, style]}>
      {body}
      <View style={styles.actions}>
        {onEdit ? (
          <Pill label="Sửa" tone="outline" size={40} onPress={onEdit} />
        ) : null}
        {!address.isDefault && onSetDefault ? (
          <TextButton label="Đặt mặc định" onPress={onSetDefault} />
        ) : null}
      </View>
    </View>
  );
}

/** Icon ghim dùng ở card "Giao đến" của Giỏ hàng. */
export function AddressPin() {
  return (
    <View style={styles.pin}>
      <Ionicons name="location-outline" size={20} color={color.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper, borderRadius: radius.card,
    padding: space.x4, gap: space.x1,
    borderWidth: 1, borderColor: color.line,
  },
  cardDefault: { borderWidth: 1.5, borderColor: color.ink, padding: 15.5 },
  selectBody: { gap: space.x1 },
  head: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  name: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: space.x4, marginTop: space.x2 },
  pin: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
});

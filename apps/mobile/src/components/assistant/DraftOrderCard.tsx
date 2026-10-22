import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import type { AssistantCreateOrderAction } from "@bq/types";
import { color, radius, space } from "@/theme";
import { Num, Pill, ProductImage, SizeChip, T } from "../ui";

export interface DraftOrderCardProps {
  action: AssistantCreateOrderAction;
  /** Tên địa chỉ giao hàng đang chọn. */
  deliverTo?: string;
  /** Đủ tồn kho và trong hạn mức hay không. */
  check: { ok: boolean; message: string };
  onEdit: () => void;
  onAdd: () => void;
  adding?: boolean;
  style?: ViewStyle;
}

/**
 * Đơn nháp do trợ lý dựng (SPEC §3.12).
 *
 * **Dòng căn cứ là bắt buộc, không phải trang trí.** Đại lý sắp thêm vào giỏ
 * một đơn vài chục triệu mà họ không gõ ra từng con số — họ phải thấy trợ lý
 * suy ra số lượng thế nào trước khi bấm. SPEC ghi rõ "luôn nói rõ cách AI suy
 * ra số lượng".
 */
export function DraftOrderCard({
  action, deliverTo, check, onEdit, onAdd, adding, style,
}: DraftOrderCardProps) {
  return (
    <View style={[styles.card, style]}>
      {action.lines.map((line) => (
        <View key={line.code} style={styles.line}>
          <ProductImage uri={line.image} style={styles.thumb} />
          <View style={styles.lineText}>
            <T variant="chip" tone="muted">{line.code}</T>
            <T variant="label" weight="semibold" numberOfLines={2}>{line.name}</T>
            <View style={styles.sizes}>
              {Object.entries(line.sizes)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([size, qty]) => <SizeChip key={size} size={size} qty={qty} />)}
            </View>
          </View>
        </View>
      ))}

      <View style={styles.totals}>
        <View style={styles.totalsLeft}>
          {deliverTo ? <T variant="chip" tone="muted">Giao đến</T> : null}
          <T variant="small" tone="muted">{`${action.total_pairs} đôi`}</T>
        </View>
        <View style={styles.totalsRight}>
          {deliverTo ? (
            <T variant="small" weight="semibold" numberOfLines={1}>{deliverTo}</T>
          ) : null}
          <Num variant="bodyStrong" weight="bold">{vnd(action.subtotal)}</Num>
        </View>
      </View>

      <View style={styles.reason}>
        <Ionicons name="information-circle-outline" size={16} color={color.muted} />
        <T variant="small" tone="muted" style={styles.reasonText}>{reasonOf(action)}</T>
      </View>

      <View style={styles.check}>
        <Ionicons
          name={check.ok ? "checkmark" : "alert-circle-outline"}
          size={16}
          color={check.ok ? color.ok : color.warn}
        />
        <T variant="small" tone={check.ok ? "ok" : "warn"} style={styles.reasonText}>
          {check.message}
        </T>
      </View>

      {/* "Sửa" rộng tự nhiên, "Thêm vào giỏ" chiếm phần còn lại: card rộng 300,
          chia đôi đều thì nhãn dài bị cắt thành "Thêm và…". */}
      <View style={styles.actions}>
        <Pill label="Sửa" tone="outline" size={44} onPress={onEdit} />
        <Pill label="Thêm vào giỏ" size={44} loading={adding} style={styles.flex} onPress={onAdd} />
      </View>
    </View>
  );
}

/**
 * Câu giải thích cách trợ lý chia số lượng.
 *
 * SUY RA TỪ CHÍNH CON SỐ trong `action`, không lấy câu mẫu của thiết kế: backend
 * không trả về lý do, và thực tế nó chia khác ví dụ trong ảnh (gõ "20 đôi size
 * 35-37" ra 20 đôi MỖI size, không phải 20 đôi chia ba). Mô tả đúng thứ nó vừa
 * làm thì đại lý mới phát hiện được khi nó hiểu sai ý mình.
 */
export function reasonOf(action: AssistantCreateOrderAction): string {
  const sizes = action.lines.flatMap((l) => Object.entries(l.sizes));
  if (sizes.length === 0) return "Chưa chọn size nào.";
  const qty = sizes.map(([, n]) => n);
  const same = qty.every((n) => n === qty[0]);
  const list = sizes.map(([s, n]) => `${s}×${n}`).join(", ");
  const head = same
    ? `${qty[0]} đôi mỗi size cho ${sizes.length} size`
    : `Chia ${action.total_pairs} đôi cho ${sizes.length} size (${list})`;
  return `${head}. Bấm “Sửa” để đổi số lượng từng size.`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.paper, borderRadius: radius.action,
    borderBottomLeftRadius: 6, padding: space.x4, gap: space.x3, maxWidth: 300,
  },
  line: {
    flexDirection: "row", gap: space.x3, backgroundColor: color.canvas,
    borderRadius: radius.field, padding: space.x3,
  },
  thumb: { width: 56 },
  lineText: { flex: 1, gap: space.x1 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  totals: { flexDirection: "row", alignItems: "flex-end", gap: space.x3 },
  totalsLeft: { flex: 1, gap: 1 },
  totalsRight: { alignItems: "flex-end", gap: 1 },
  reason: { flexDirection: "row", gap: space.x2 },
  reasonText: { flex: 1 },
  check: { flexDirection: "row", gap: space.x2 },
  actions: { flexDirection: "row", gap: space.x2 },
  flex: { flex: 1 },
});

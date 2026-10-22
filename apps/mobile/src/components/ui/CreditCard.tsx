import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { Num } from "./Num";
import { Price } from "./Price";
import { T } from "./T";

export interface CreditCardProps {
  /** "Hạn mức khả dụng" (Trang chủ) hoặc "Dư nợ hiện tại" (Công nợ). */
  label: string;
  amount: number;
  /** Chip trắng mờ góc phải: "✓ Hạng Vàng, CK 20%", "✓ Quá hạn 0đ". */
  chip?: React.ReactNode;
  /** Phần đã dùng, 0…1. Bỏ trống thì không vẽ thanh. */
  progress?: number;
  /** Hai số dưới thanh: "Tổng hạn mức 500 tr" / "Đã dùng 312,4 tr". */
  stats?: { label: string; value: string }[];
  /** Khối phụ nền tối bên trong — hàng "Hạn thanh toán" ở Trang chủ. */
  extra?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Thẻ hạn mức / công nợ (SPEC §2) — mảng cam LỚN DUY NHẤT của app.
 *
 * Nền PHẲNG `brand`, không gradient: v2 bỏ gradient vì hai đầu gradient có tỉ
 * lệ tương phản khác nhau, nên chữ trắng đặt lên chỗ sáng thì đạt mà trượt ở
 * chỗ tối — không kiểm được bằng một con số.
 *
 * Mọi chữ bên trong là trắng trên `brand` = 4.79:1, đạt AA cả chữ thường.
 */
export function CreditCard({
  label, amount, chip, progress, stats, extra, style,
}: CreditCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Đường chỉ khâu nét đứt — hoạ tiết nhận diện, cách mép 7. */}
      <View style={styles.stitch} pointerEvents="none" />

      <View style={styles.head}>
        <T variant="label" weight="medium" tone="white" style={styles.label}>{label}</T>
        {chip}
      </View>

      <Price value={amount} variant="amountHero" tone="white" />

      {progress !== undefined ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
        </View>
      ) : null}

      {stats?.length ? (
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && styles.statRight]}>
              <T variant="small" tone="white">{`${s.label} `}</T>
              <Num variant="small" weight="bold" tone="white">{s.value}</Num>
            </View>
          ))}
        </View>
      ) : null}

      {extra ? <View style={styles.extra}>{extra}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.brand, borderRadius: radius.credit,
    padding: 22, gap: space.x3,
  },
  stitch: {
    position: "absolute", top: 7, left: 7, right: 7, bottom: 7,
    borderRadius: radius.stitch, borderWidth: 1, borderStyle: "dashed",
    borderColor: color.whiteA(0.32),
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  label: { flex: 1 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: color.whiteA(0.28) },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: color.white },
  stats: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, flexDirection: "row", alignItems: "baseline" },
  statRight: { justifyContent: "flex-end" },
  extra: {
    backgroundColor: color.blackA(0.18), borderRadius: radius.option,
    padding: space.x3, marginTop: space.x1,
  },
});

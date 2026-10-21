import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Dealer } from "@bq/types";
import { brandGradient, color, radius, space } from "@/theme";
import { Price, T } from "../ui";

export interface CreditCardProps {
  dealer: Dealer;
  /** Hoá đơn tới hạn gần nhất. Bỏ trống thì khối "Hạn thanh toán" không hiện. */
  nextDue?: { label: string; amount: number } | null;
  /** Số tiền của đơn đang soạn — hiện thêm vạch dự kiến trên thanh tiến độ. */
  pendingAmount?: number;
  style?: ViewStyle;
}

/**
 * Thẻ hạn mức công nợ — điểm nhấn thương hiệu ở trang chủ và màn Công nợ.
 *
 * Chữ trắng trên gradient cam: mọi chữ ở đây đều ≥ 13px và weight ≥ 500, đặt
 * trên vùng `bq`→`bqDeep`. KHÔNG đặt chữ lên vùng `bqBright` (2.61:1, không
 * đạt cả chữ lớn) — vì vậy gradient chạy chéo và nội dung dồn về nửa dưới.
 */
export function CreditCard({ dealer, nextDue, pendingAmount = 0, style }: CreditCardProps) {
  const limit = Math.max(1, dealer.credit_limit);
  const usedPct = Math.min(100, (dealer.credit_used / limit) * 100);
  const pendingPct = Math.min(100 - usedPct, (pendingAmount / limit) * 100);

  return (
    <LinearGradient
      colors={[...brandGradient.colors]}
      start={brandGradient.start}
      end={brandGradient.end}
      style={[styles.wrap, style]}
    >
      {/* Đường chỉ khâu — gợi liên tưởng đồ da, inset 7 như spec */}
      <View style={styles.stitch} pointerEvents="none" />

      <T variant="small" tone="white" style={styles.dim}>Hạn mức khả dụng</T>
      <Price value={dealer.credit_available} variant="display" tone="white" />

      <View style={styles.track}>
        <View style={[styles.used, { width: `${usedPct}%` }]} />
        {pendingPct > 0 ? (
          <View style={[styles.pending, { left: `${usedPct}%`, width: `${pendingPct}%` }]} />
        ) : null}
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <T variant="micro" tone="white" style={styles.dim}>Tổng hạn mức</T>
          <Price value={dealer.credit_limit} variant="bodyStrong" tone="white" />
        </View>
        <View style={styles.col}>
          <T variant="micro" tone="white" style={styles.dim}>Đã dùng</T>
          <Price value={dealer.credit_used} variant="bodyStrong" tone="white" />
        </View>
      </View>

      {nextDue ? (
        <View style={styles.due}>
          <View style={styles.dueText}>
            <T variant="micro" tone="white" style={styles.dim}>Hạn thanh toán gần nhất</T>
            <T variant="small" weight="semibold" tone="white">{nextDue.label}</T>
          </View>
          <Price value={nextDue.amount} variant="bodyStrong" tone="white" />
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.plate, padding: space.x5, gap: space.x3 },
  stitch: {
    position: "absolute", top: 7, left: 7, right: 7, bottom: 7,
    borderRadius: radius.card, borderWidth: 1, borderStyle: "dashed",
    borderColor: color.whiteA(0.22),
  },
  dim: { opacity: 0.82 },
  track: {
    height: 6, borderRadius: radius.pill, backgroundColor: color.whiteA(0.25),
    overflow: "hidden", marginTop: space.x1,
  },
  used: { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: color.white },
  pending: {
    position: "absolute", top: 0, bottom: 0,
    backgroundColor: color.whiteA(0.55),
  },
  row: { flexDirection: "row", gap: space.x6 },
  col: { gap: 2 },
  due: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: color.whiteA(0.18), borderRadius: radius.field,
    padding: space.x3, marginTop: space.x1,
  },
  dueText: { gap: 2 },
});

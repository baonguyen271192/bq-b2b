import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { Card, CardDivider } from "./Card";
import { Price } from "./Price";
import { StatusTag, type StatusKind } from "./StatusTag";
import { T } from "./T";

export interface CreditCardProps {
  limit: number;
  used: number;
  /** Giá trị đơn đang dựng, để xem trước hạn mức CÒN LẠI SAU ĐƠN. */
  pending?: number;
  /** Dòng dẫn sang màn công nợ. Bỏ trống thì không hiện. */
  detailLabel?: string;
  onPressDetail?: () => void;
  style?: ViewStyle;
}

/** Thẻ này chỉ sinh ba trong năm trạng thái — hẹp kiểu lại để FILL tra được. */
type CreditKind = Extract<StatusKind, "ok" | "warn" | "danger">;

/** Màu theo mức dùng — xem chú thích ở component. */
function kindFor(usedRatio: number, pendingRatio: number, afterOrder: number): CreditKind {
  if (afterOrder < 0) return "danger";
  if (usedRatio + pendingRatio > 0.8) return "warn";
  return "ok";
}

const FILL: Record<CreditKind, string> = {
  ok: color.ok, warn: color.warn, danger: color.danger,
};

/**
 * Hạn mức công nợ — số liệu quan trọng nhất với đại lý sỉ.
 *
 * Hai điều cố ý giữ từ bản cũ vì chúng là CHỨC NĂNG, không phải trang trí:
 *  1. Màu đổi theo mức dùng (xanh → hổ phách → đỏ). Đại lý quét mắt thấy màu
 *     trước khi đọc số; một thanh cam cố định không nói lên điều gì.
 *  2. Xem trước "sau đơn" ngay trên thanh: phần đơn đang dựng vẽ bằng vạch nhạt
 *     chồng lên, nên người đặt thấy mình sắp chạm trần TRƯỚC khi bấm gửi.
 *
 * CỐ Ý nền trắng chứ không phải thẻ gradient cam: ba màu trạng thái ở trên đặt
 * trên nền cam sẽ đục và mất nghĩa. Màu thương hiệu của màn này nằm ở dải hero
 * phía sau tiêu đề.
 */
export function CreditCard({
  limit, used, pending = 0, detailLabel, onPressDetail, style,
}: CreditCardProps) {
  const available = limit - used;
  const afterOrder = available - pending;
  const safeLimit = Math.max(limit, 1);

  const usedRatio = Math.min(Math.max(used / safeLimit, 0), 1);
  const pendingRatio = Math.min(Math.max(pending / safeLimit, 0), 1 - usedRatio);
  const kind = kindFor(usedRatio, pendingRatio, afterOrder);
  const fill = FILL[kind];

  return (
    <Card style={style}>
      <View style={styles.head}>
        <T variant="small" tone="muted">Hạn mức khả dụng</T>
        <StatusTag
          kind={kind}
          label={afterOrder < 0 ? "Vượt hạn mức" : `Đã dùng ${Math.round(usedRatio * 100)}%`}
        />
      </View>

      <Price value={available} variant="display" tone={afterOrder < 0 ? "danger" : "ink"} />

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            // minWidth: ở mức dùng rất thấp, phần trăm co lại thành một chấm
            // tròn trông như lỗi hiển thị. Giữ một vạch ngắn để vẫn đọc được là
            // "có dùng".
            {
              width: `${usedRatio * 100}%`,
              minWidth: usedRatio > 0 ? space.x4 : 0,
              backgroundColor: fill,
            },
          ]}
        />
        {pending > 0 ? (
          <View
            style={[styles.fill, styles.pendingFill, {
              width: `${pendingRatio * 100}%`, borderColor: fill,
            }]}
          />
        ) : null}
      </View>

      <View style={styles.stats}>
        <Stat label="Tổng hạn mức" value={limit} />
        <Stat label="Đã dùng" value={used} tone="bq" />
      </View>

      {pending > 0 ? (
        <View style={styles.preview}>
          <Ionicons name="trending-down-outline" size={16} color={fill} />
          <T variant="small" style={styles.grow}>Còn lại sau đơn này</T>
          <Price value={afterOrder} variant="small" tone={afterOrder < 0 ? "danger" : "ink"} />
        </View>
      ) : null}

      {detailLabel ? (
        <>
          <View style={styles.rule}><CardDivider /></View>
          <Pressable
            onPress={onPressDetail}
            accessibilityRole="button"
            accessibilityLabel={detailLabel}
            style={styles.detail}
          >
            <Ionicons name="calendar-outline" size={17} color={color.bq} />
            <T variant="small" tone="muted" style={styles.grow}>{detailLabel}</T>
            <Ionicons name="chevron-forward" size={17} color={color.faint} />
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ink" | "bq" }) {
  return (
    <View style={styles.stat}>
      <T variant="micro" tone="muted">{label}</T>
      <Price value={value} variant="small" tone={tone ?? "ink"} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: space.x1,
  },
  track: {
    height: space.x2, borderRadius: radius.pill, backgroundColor: color.plate,
    marginTop: space.x3, flexDirection: "row", overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
  pendingFill: { borderWidth: 1.5, borderStyle: "dashed", backgroundColor: "transparent" },
  stats: { flexDirection: "row", marginTop: space.x4, gap: space.x4 },
  stat: { flex: 1, gap: space.x1 },
  grow: { flex: 1 },
  preview: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    marginTop: space.x3, padding: space.x3,
    borderRadius: radius.field, backgroundColor: color.canvas,
  },
  rule: { marginTop: space.x4 },
  detail: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    minHeight: space.x12, marginTop: space.x1,
  },
});

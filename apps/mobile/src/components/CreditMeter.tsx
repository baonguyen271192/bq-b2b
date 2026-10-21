import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import { Text, colors, radius, space } from "@/theme";
import { Card } from "./Card";

interface Props {
  limit: number;
  used: number;
  /** Giá trị đơn đang dựng, để xem trước hạn mức CÒN LẠI SAU ĐƠN. */
  pending?: number;
  dueLabel?: string;
}

/**
 * Hạn mức công nợ — số liệu quan trọng nhất với đại lý sỉ.
 *
 * Hai điều cải tiến so với bản thiết kế gốc:
 *  1. Màu đổi theo mức sử dụng (xanh → hổ phách → đỏ). Đại lý quét mắt thấy màu
 *     trước khi đọc số; một thanh cam cố định không nói lên điều gì.
 *  2. Xem trước "sau đơn" ngay trên thanh: phần đơn đang dựng vẽ bằng vạch nhạt
 *     chồng lên, nên người đặt thấy mình sắp chạm trần TRƯỚC khi bấm gửi.
 */
export function CreditMeter({ limit, used, pending = 0, dueLabel }: Props) {
  const available = limit - used;
  const afterOrder = available - pending;
  const safeLimit = Math.max(limit, 1);

  const usedRatio = Math.min(Math.max(used / safeLimit, 0), 1);
  const pendingRatio = Math.min(Math.max(pending / safeLimit, 0), 1 - usedRatio);

  const tone =
    afterOrder < 0 ? colors.danger
    : usedRatio + pendingRatio > 0.8 ? colors.warning
    : colors.success;

  return (
    <Card>
      <View style={styles.head}>
        <Text variant="label" color={colors.textMuted}>
          Hạn mức khả dụng
        </Text>
        <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text variant="caption" weight="600" color={tone.fg}>
            {afterOrder < 0 ? "Vượt hạn mức" : `Đã dùng ${Math.round(usedRatio * 100)}%`}
          </Text>
        </View>
      </View>

      <Text variant="display" color={afterOrder < 0 ? colors.danger.fg : colors.text}>
        {vnd(available)}
      </Text>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            // minWidth: ở mức dùng rất thấp, phần trăm co lại thành một chấm tròn
            // trông như lỗi hiển thị. Giữ một vạch ngắn để vẫn đọc được là "có dùng".
            { width: `${usedRatio * 100}%`, minWidth: usedRatio > 0 ? 14 : 0, backgroundColor: tone.fg },
          ]}
        />
        {pending > 0 ? (
          <View
            style={[
              styles.fill,
              styles.pendingFill,
              { width: `${pendingRatio * 100}%`, borderColor: tone.fg },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.stats}>
        <Stat label="Tổng hạn mức" value={vnd(limit)} />
        <Stat label="Đã dùng" value={vnd(used)} tone={colors.brand[500]} />
      </View>

      {pending > 0 ? (
        <View style={[styles.preview, { borderColor: tone.border, backgroundColor: tone.bg }]}>
          <Ionicons name="trending-down-outline" size={16} color={tone.fg} />
          <Text variant="bodySm" color={tone.fg} style={{ flex: 1 }}>
            Còn lại sau đơn này
          </Text>
          <Text variant="bodySm" weight="700" color={tone.fg}>
            {vnd(afterOrder)}
          </Text>
        </View>
      ) : null}

      {dueLabel ? (
        <View style={styles.due}>
          <Ionicons name="calendar-outline" size={17} color={colors.brand[500]} />
          <Text variant="bodySm" color={colors.textMuted} style={{ flex: 1 }}>
            {dueLabel}
          </Text>
          <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
        </View>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color={colors.textMuted}>{label}</Text>
      <Text variant="bodySm" weight="700" color={tone ?? colors.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.slate[150],
    marginTop: space.md,
    flexDirection: "row",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
  pendingFill: { borderWidth: 1.5, borderStyle: "dashed", backgroundColor: "transparent" },
  stats: { flexDirection: "row", marginTop: space.lg, gap: space.lg },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  due: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

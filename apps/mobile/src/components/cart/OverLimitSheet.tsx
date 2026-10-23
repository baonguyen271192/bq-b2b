import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd, vndShort } from "@bq/core";
import { color, radius, space } from "@/theme";
import { BottomSheet, Num, Pill, RadioCard, SplitBar, T } from "../ui";

export type OverLimitChoice = "approve" | "pay" | "reduce";

export interface OverLimitSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Tổng giỏ sau khi thêm. */
  cartTotal: number;
  /** Hạn mức khả dụng. */
  available: number;
  /** Hoá đơn gần đến hạn nhất, để gợi ý trả bớt. */
  nextInvoice?: { id: string; amount: number } | null;
  onConfirm: (choice: OverLimitChoice) => void;
}

const CTA: Record<OverLimitChoice, string> = {
  approve: "Gửi đơn chờ duyệt",
  pay: "Thanh toán",
  reduce: "Sửa số lượng",
};

/**
 * Sheet "Đơn vượt hạn mức" (SPEC §3.14) và biến thể "Hạn mức đã dùng hết"
 * (§3.27).
 *
 * Không chặn đại lý: lựa chọn mặc định là GỬI ĐƠN, các lối còn lại chỉ là gợi
 * ý. Chặn cứng ở đây đẩy họ sang gọi điện cho Sale — tức là vẫn đặt được, chỉ
 * là không qua app nữa.
 *
 * HAI trạng thái, không phải hai sheet: khi `available <= 0` (nợ cũ đã vượt
 * TRƯỚC đơn này) thì bỏ thanh so sánh và bỏ hẳn lựa chọn "Giảm số lượng" —
 * không số lượng nào đưa đơn về trong hạn mức được, để nguyên là chỉ dẫn một
 * đường cụt.
 */
export function OverLimitSheet({
  visible, onClose, cartTotal, available, nextInvoice, onConfirm,
}: OverLimitSheetProps) {
  const [choice, setChoice] = useState<OverLimitChoice>("approve");
  /** Nợ cũ ĐÃ vượt trước khi tính đơn này. */
  const alreadyOver = available <= 0;
  const over = Math.max(0, cartTotal - available);
  const needApproval = alreadyOver ? -available + cartTotal : over;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="information-circle" size={24} color={color.warn} />
        </View>

        {alreadyOver ? (
          <>
            <T variant="title">Hạn mức đã dùng hết</T>
            <T variant="label" weight="regular" tone="muted">
              Dư nợ đã vượt hạn mức từ trước, nên đơn này cần Sale duyệt dù ít hay nhiều.
            </T>

            <View style={styles.sums}>
              <Row label="Đang vượt hạn mức" value={vnd(-available)} tone="danger" />
              <Row label="Đơn này" value={`+${vnd(cartTotal)}`} />
              <View style={styles.rule} />
              <Row label="Cần duyệt tổng" value={vnd(needApproval)} strong />
            </View>
          </>
        ) : (
          <>
            <T variant="title">{`Đơn vượt hạn mức ${vnd(over)}`}</T>
            <T variant="label" weight="regular" tone="muted">
              {"Giỏ hàng sau khi thêm là "}
              <T variant="label" weight="bold">{vnd(cartTotal)}</T>
              {", hạn mức khả dụng còn "}
              <T variant="label" weight="bold">{vnd(available)}</T>
              .
            </T>

            <SplitBar
              within={Math.min(cartTotal, available)}
              over={over}
              leftLabel={`Trong hạn mức ${vndShort(Math.min(cartTotal, available))}`}
              rightLabel={`Vượt ${vndShort(over)}`}
              style={styles.bar}
            />
          </>
        )}

        <RadioCard
          selected={choice === "approve"}
          onPress={() => setChoice("approve")}
          title="Gửi đơn chờ Sale duyệt"
          description={
            alreadyOver
              ? "Bạn nhận thông báo khi có kết quả. Hàng chưa được giữ trong lúc chờ."
              : "Sale phụ trách sẽ xem xét nâng hạn mức cho đơn này. Bạn nhận thông báo khi có kết quả."
          }
        />
        <RadioCard
          selected={choice === "pay"}
          onPress={() => setChoice("pay")}
          title={alreadyOver ? "Thanh toán công nợ trước" : "Thanh toán bớt công nợ trước"}
          description={
            alreadyOver
              ? `Trả từ ${vnd(needApproval)} để đặt ngay không cần duyệt, hoặc trả một phần để giảm nợ.`
              : nextInvoice
                ? `Trả ${nextInvoice.id} (${vnd(nextInvoice.amount)}) để mở thêm hạn mức, rồi đặt ngay.`
                : "Trả bớt công nợ để mở thêm hạn mức, rồi đặt ngay."
          }
        />
        {/* "Giảm số lượng" CHỈ có nghĩa khi còn hạn mức để lọt vào. Nợ cũ đã
            vượt thì không số lượng nào đưa đơn về trong hạn mức — để nguyên là
            chỉ cho đại lý một đường cụt. */}
        {alreadyOver ? null : (
          <RadioCard
            selected={choice === "reduce"}
            onPress={() => setChoice("reduce")}
            title="Giảm số lượng"
            description="Quay lại chọn size để đơn nằm trong hạn mức."
          />
        )}

        <Pill label={CTA[choice]} onPress={() => onConfirm(choice)} style={styles.cta} />
      </View>
    </BottomSheet>
  );
}

/** Một dòng trong khối cộng trừ của biến thể §3.27. */
function Row({
  label, value, tone, strong,
}: { label: string; value: string; tone?: "danger"; strong?: boolean }) {
  return (
    <View style={styles.sumRow}>
      <T variant={strong ? "bodyStrong" : "label"} weight={strong ? "bold" : "regular"}>
        {label}
      </T>
      <Num
        variant={strong ? "cardTitle" : "label"}
        weight={strong ? "extrabold" : "semibold"}
        tone={tone ?? "ink"}
      >
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.x3, paddingBottom: space.x5 },
  icon: {
    width: 48, height: 48, borderRadius: radius.pill, backgroundColor: color.warnTint,
    alignItems: "center", justifyContent: "center",
  },
  bar: { marginVertical: space.x2 },
  /** Khối cộng trừ của §3.27 — nền lõm trên sheet trắng. */
  sums: {
    backgroundColor: color.canvas, borderRadius: radius.option,
    padding: space.x4, gap: space.x2, marginVertical: space.x2,
  },
  sumRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.x3 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line, marginVertical: space.x1 },
  cta: { marginTop: space.x2 },
});

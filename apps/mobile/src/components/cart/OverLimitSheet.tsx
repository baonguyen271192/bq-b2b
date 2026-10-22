import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd, vndShort } from "@bq/core";
import { color, radius, space } from "@/theme";
import { BottomSheet, Pill, RadioCard, SplitBar, T } from "../ui";

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
 * Sheet "Đơn vượt hạn mức" (SPEC §3.14).
 *
 * Không chặn đại lý: lựa chọn mặc định là GỬI ĐƠN, hai lối còn lại chỉ là gợi ý.
 * Chặn cứng ở đây đẩy họ sang gọi điện cho Sale — tức là vẫn đặt được, chỉ là
 * không qua app nữa.
 */
export function OverLimitSheet({
  visible, onClose, cartTotal, available, nextInvoice, onConfirm,
}: OverLimitSheetProps) {
  const [choice, setChoice] = useState<OverLimitChoice>("approve");
  const over = Math.max(0, cartTotal - available);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="information-circle" size={24} color={color.warn} />
        </View>

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

        <RadioCard
          selected={choice === "approve"}
          onPress={() => setChoice("approve")}
          title="Gửi đơn chờ Sale duyệt"
          description="Sale sẽ xem xét nâng hạn mức cho đơn này. Bạn nhận thông báo khi có kết quả."
        />
        <RadioCard
          selected={choice === "pay"}
          onPress={() => setChoice("pay")}
          title="Thanh toán bớt công nợ trước"
          description={
            nextInvoice
              ? `Trả ${nextInvoice.id} (${vnd(nextInvoice.amount)}) để mở thêm hạn mức, rồi đặt ngay.`
              : "Trả bớt công nợ để mở thêm hạn mức, rồi đặt ngay."
          }
        />
        <RadioCard
          selected={choice === "reduce"}
          onPress={() => setChoice("reduce")}
          title="Giảm số lượng"
          description="Quay lại chọn size để đơn nằm trong hạn mức."
        />

        <Pill label={CTA[choice]} onPress={() => onConfirm(choice)} style={styles.cta} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.x3, paddingBottom: space.x5 },
  icon: {
    width: 48, height: 48, borderRadius: radius.pill, backgroundColor: color.warnTint,
    alignItems: "center", justifyContent: "center",
  },
  bar: { marginVertical: space.x2 },
  cta: { marginTop: space.x2 },
});

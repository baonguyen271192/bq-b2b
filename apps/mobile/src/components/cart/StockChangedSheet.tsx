import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { BottomSheet, Pill, RadioCard, T, TextButton } from "../ui";
import type { StockShortage } from "@/lib/repo/orders";

export type StockFix = "trim" | "drop";

export interface StockChangedSheetProps {
  visible: boolean;
  shortages: StockShortage[];
  onClose: () => void;
  onConfirm: (fix: StockFix) => void;
}

/**
 * Sheet "Tồn kho đã thay đổi" (SPEC mục 5.D-2), dựng theo đúng khuôn của
 * {@link OverLimitSheet}.
 *
 * Mở khi API báo thiếu hàng LÚC GỬI ĐƠN — nghĩa là giữa lúc đại lý chọn size và
 * lúc bấm đặt, có người khác lấy mất. Hai đại lý cùng giành 6 đôi cuối của một
 * size là chuyện thường ngày, nên đây không phải ca hiếm.
 */
export function StockChangedSheet({
  visible, shortages, onClose, onConfirm,
}: StockChangedSheetProps) {
  const [fix, setFix] = useState<StockFix>("trim");

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="information-circle" size={24} color={color.warn} />
        </View>

        <T variant="title">Tồn kho đã thay đổi</T>
        <T variant="label" weight="regular" tone="muted">
          Một số size đã được đại lý khác lấy trong lúc bạn chọn. Chọn cách xử lý
          rồi gửi lại đơn.
        </T>

        <View style={styles.list}>
          {shortages.map((s) => (
            <View key={`${s.code}-${s.size}`} style={styles.row}>
              <T variant="small" weight="semibold" style={styles.rowName} numberOfLines={1}>
                {`${s.code} size ${s.size}`}
              </T>
              <T variant="small" tone="danger">
                {`còn ${s.left}, bạn đặt ${s.wanted}`}
              </T>
            </View>
          ))}
        </View>

        <RadioCard
          selected={fix === "trim"}
          onPress={() => setFix("trim")}
          title="Đặt theo số còn lại"
          description="Tự hạ số lượng của những size thiếu xuống đúng số còn trong kho."
        />
        <RadioCard
          selected={fix === "drop"}
          onPress={() => setFix("drop")}
          title="Bỏ size này"
          description="Bỏ hẳn những size đã hết khỏi đơn, giữ nguyên các size còn lại."
        />

        <Pill label="Cập nhật và đặt hàng" onPress={() => onConfirm(fix)} style={styles.cta} />
        <TextButton label="Quay lại giỏ" onPress={onClose} style={styles.back} />
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
  list: {
    backgroundColor: color.paper, borderRadius: radius.option,
    paddingHorizontal: space.x4, paddingVertical: space.x2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.x3, paddingVertical: space.x2 },
  rowName: { flex: 1 },
  cta: { marginTop: space.x2 },
  back: { alignSelf: "center" },
});

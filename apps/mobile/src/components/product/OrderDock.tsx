import { StyleSheet, View } from "react-native";
import { vnd } from "@bq/core";
import { space } from "@/theme";
import { Num, Price, T } from "../ui";

export interface OrderDockProps {
  /** Số đôi đang chọn ở màn/sheet này. */
  pairs: number;
  /** Tiền của phần đang chọn. */
  money: number;
  /** Hạn mức còn LẠI sau khi tính phần đang chọn. Âm = vượt. */
  left: number;
  /** Hạn mức còn khi CHƯA chọn gì — số hiện lúc `pairs === 0`. */
  available: number;
}

/**
 * Hai số ở dock khi đang chọn size — dùng CHUNG cho màn Chi tiết sản phẩm và
 * sheet Đặt nhanh (SPEC §5-N.3).
 *
 * Gộp lại vì lỗi "0 đôi mà đã báo vượt hạn mức" đã lặp HAI LẦN: sửa ở Chi tiết
 * xong thì sheet Đặt nhanh vẫn sai, vì hai chỗ là hai bản mã giống nhau. Một
 * component thì sửa một lần.
 */
export function OrderDock({ pairs, money, left, available }: OrderDockProps) {
  /**
   * Chỉ báo vượt khi đã chọn đôi nào đó. Ở "0 đôi · 0đ" thì khoản vượt là nợ cũ,
   * không phải việc đang làm — bật cảnh báo đỏ ở đó là doạ nhầm chỗ.
   */
  const over = pairs > 0 && left < 0;

  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <T variant="small" tone="muted">{`${pairs} đôi đã chọn`}</T>
        <Price value={money} variant="amountSm" weight="extrabold" />
      </View>
      <View style={[styles.col, styles.colRight]}>
        <T variant="small" tone="muted">{over ? "Vượt hạn mức" : "Hạn mức còn"}</T>
        <Num variant="label" weight="semibold" tone={over ? "danger" : "ink"}>
          {vnd(over ? -left : Math.max(0, pairs > 0 ? left : available))}
        </Num>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: space.x3 },
  col: { flex: 1, gap: 1 },
  colRight: { alignItems: "flex-end" },
});

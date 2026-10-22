import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { Num } from "./Num";
import { Stepper } from "./Stepper";
import { T } from "./T";

export interface SizeRowProps {
  size: string | number;
  /** Tồn kho bán được của size này. 0 = hết hàng. */
  stock: number;
  qty: number;
  onChange: (next: number) => void;
  onExceedStock?: (stock: number) => void;
  /** Kẻ divider phía dưới. Hàng cuối để false. */
  divider?: boolean;
  style?: ViewStyle;
}

/** Ngưỡng mức tồn — dùng chung cho vạch và cho nhãn. */
const PLENTY = 50;
const LOW = 15;

/** Số vạch và màu theo mức tồn (SPEC §2). */
export function stockLevel(stock: number): { bars: number; color: string } {
  if (stock >= PLENTY) return { bars: 3, color: color.ok };
  if (stock >= LOW) return { bars: 2, color: color.stockMid };
  if (stock > 0) return { bars: 1, color: color.danger };
  return { bars: 0, color: color.line };
}

/** Nhãn tồn kho. "Sắp hết" bật dưới 50 đôi — dưới mức đó không đủ một đợt bán. */
export function stockLabel(stock: number): string {
  if (stock <= 0) return "Hết hàng";
  return stock < PLENTY ? `Sắp hết, còn ${stock}` : `còn ${stock}`;
}

/**
 * Một dòng size trong bảng size (SPEC §2): puck · vạch tồn + nhãn · {@link Stepper}.
 *
 * Nhãn tồn dùng bậc 13 chứ không phải 12 như §2 ghi: đây là chữ MANG THÔNG TIN
 * (quyết định mua hay không nằm ở chính con số này), mà quyết định mục 5.B đặt
 * sàn 13 "không ngoại lệ" và ưu tiên cao hơn §2.
 *
 * Vạch màu luôn đi KÈM chữ, không bao giờ đứng một mình: màu là lối tắt cho
 * người quét nhanh, chữ là thông tin thật cho mọi người còn lại.
 */
export function SizeRow({
  size, stock, qty, onChange, onExceedStock, divider, style,
}: SizeRowProps) {
  const soldOut = stock <= 0;
  const picked = qty > 0;
  const level = stockLevel(stock);

  return (
    <View
      style={[styles.row, divider && styles.divider, style]}
      accessibilityLabel={`Size ${size}, ${stockLabel(stock)}`}
    >
      <View style={[styles.puck, soldOut ? styles.puckOut : picked ? styles.puckOn : styles.puckOff]}>
        <Num
          variant="cardTitle"
          weight="bold"
          tone={picked && !soldOut ? "white" : soldOut ? "muted" : "ink"}
          style={soldOut ? styles.struck : undefined}
        >
          {size}
        </Num>
      </View>

      <View style={styles.stock}>
        <View style={styles.bars}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i < level.bars ? level.color : color.line }]}
            />
          ))}
        </View>
        <T variant="small" tone="muted">{stockLabel(stock)}</T>
      </View>

      <Stepper
        value={qty}
        onChange={onChange}
        max={stock}
        soldOut={soldOut}
        onExceedMax={onExceedStock}
        subject={`size ${size}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    minHeight: 52, paddingVertical: space.x1,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  puck: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  puckOn: { backgroundColor: color.ink },
  puckOff: { backgroundColor: color.paper, borderWidth: 1.5, borderColor: color.line },
  puckOut: { backgroundColor: color.subtle },
  struck: { textDecorationLine: "line-through" },
  stock: { flex: 1, gap: space.x1 },
  bars: { flexDirection: "row", gap: 3 },
  bar: { width: 16, height: 4, borderRadius: 2 },
});

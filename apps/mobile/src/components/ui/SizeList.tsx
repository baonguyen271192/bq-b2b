import { View, type ViewStyle } from "react-native";
import { SizeRow } from "./SizeRow";

/** Bảng size đã chọn: khoá là size, giá trị là số đôi. */
export type SizeQty = Record<string, number>;

export interface SizeListProps {
  /** Tồn kho bán được theo size — quyết định thứ tự hiển thị và chặn trên. */
  stock: SizeQty;
  value: SizeQty;
  onChange: (next: SizeQty) => void;
  onExceedStock?: (size: string, stock: number) => void;
  style?: ViewStyle;
}

/**
 * Danh sách {@link SizeRow} cho một mẫu (SPEC §3.4, §3.5).
 *
 * Luôn hiện ĐỦ mọi size, kể cả size hết hàng: ẩn đi thì đại lý không biết là
 * BQ không có size đó hay chỉ tạm hết, mà hai chuyện đó dẫn tới hai hành động
 * khác nhau.
 */
export function SizeList({ stock, value, onChange, onExceedStock, style }: SizeListProps) {
  const sizes = Object.keys(stock).sort((a, b) => Number(a) - Number(b));
  return (
    <View style={style}>
      {sizes.map((s, i) => (
        <SizeRow
          key={s}
          size={s}
          stock={stock[s] ?? 0}
          qty={value[s] ?? 0}
          divider={i < sizes.length - 1}
          onExceedStock={(max) => onExceedStock?.(s, max)}
          onChange={(n) => {
            const next = { ...value };
            if (n > 0) next[s] = n;
            else delete next[s];
            onChange(next);
          }}
        />
      ))}
    </View>
  );
}

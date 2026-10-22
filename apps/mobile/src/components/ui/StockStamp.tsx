import { useEffect, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, space } from "@/theme";
import { T } from "./T";
import { TextButton } from "./TextButton";

/** Dữ liệu cũ hơn ngần này thì đổi sang màu warn và mời làm mới (SPEC §3.4). */
export const STOCK_STALE_MS = 15 * 60 * 1000;

export interface StockStampProps {
  /** Thời điểm đọc tồn kho từ API. */
  fetchedAt: Date;
  onRefresh?: () => void;
  style?: ViewStyle;
}

/** "09:41" theo giờ máy. */
export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Dòng "⟳ Tồn kho cập nhật lúc HH:mm" đặt ngay trên bảng size (SPEC §3.4, §3.5).
 *
 * Đây là thành phần nhỏ nhưng là lời hứa quan trọng nhất của màn đặt hàng: con
 * số tồn kho bên dưới chỉ đúng tại thời điểm này. Thiếu nó thì đại lý tin rằng
 * số đang hiện là số thật lúc họ bấm đặt.
 *
 * `fetchedAt` là lúc CLIENT nhận phản hồi, không phải lúc backend chốt số —
 * backend chưa trả mốc thời gian nào (xem `// TODO(api)` ở màn gọi).
 */
export function StockStamp({ fetchedAt, onRefresh, style }: StockStampProps) {
  /**
   * "Đã cũ chưa" phụ thuộc đồng hồ, nên phải là state có nhịp đập chứ không
   * phải `Date.now()` gọi thẳng trong render: gọi trong render là hàm không
   * thuần, và tệ hơn — màn mở suốt buổi sáng sẽ mãi hiện "mới cập nhật" vì
   * không có gì khiến nó vẽ lại.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const stale = now - fetchedAt.getTime() > STOCK_STALE_MS;
  return (
    <View style={[styles.row, style]}>
      <Ionicons name="refresh" size={14} color={stale ? color.warn : color.muted} />
      <T variant="small" tone={stale ? "warn" : "muted"}>
        {`Tồn kho cập nhật lúc ${hhmm(fetchedAt)}`}
      </T>
      {stale && onRefresh ? <TextButton label="Làm mới" tone="brand" onPress={onRefresh} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.x2 },
});

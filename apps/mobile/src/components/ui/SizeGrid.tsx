import { useMemo } from "react";
import * as Haptics from "expo-haptics";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, space } from "@/theme";
import { Chip } from "./Chip";
import { SectionHead } from "./SectionHead";
import { Stepper } from "./Stepper";
import { T } from "./T";

export type SizeQty = Record<string, number>;

export interface SizeGridProps {
  /** size -> tồn kho khả dụng */
  stock: Record<string, number>;
  value: SizeQty;
  onChange: (next: SizeQty) => void;
  style?: ViewStyle;
}

/** Dải size "chạy" mặc định cho lệnh đặt nhanh: size giữa nhiều hơn hai đầu. */
const SIZE_RUN: Record<string, number> = { low: 2, mid: 4, high: 2 };
/** Nhấn giữ nút + cộng bấy nhiêu — bước nhảy quen thuộc khi đặt sỉ. */
const LONG_PRESS_STEP = 5;

/**
 * Bảng size — màn đặc trưng của bán sỉ và là màn được dùng nhiều nhất.
 *
 * Bốn điều cố ý giữ, đều vì đây là app cầm tay:
 *  1. Nút −/+ thay ô nhập số. Gõ số cho lưới 8 size trên bàn phím điện thoại thì
 *     chậm và dễ sai; đại lý thường cộng dồn từng ít một.
 *  2. Tồn kho hiện ngay dưới mỗi size, size hết hàng khoá rõ ràng thay vì cho
 *     bấm rồi mới báo lỗi.
 *  3. Nhấn giữ dấu + cộng 5 đôi.
 *  4. "Size Run" điền sẵn cả dải theo phân bố thường gặp.
 *
 * KHÔNG còn thanh tổng kết nền đậm ở cuối như bản cũ: tổng số đôi và thành tiền
 * đã nằm ở Dock dán đáy màn, luôn nhìn thấy kể cả khi cuộn. Giữ cả hai là nói
 * cùng một con số hai lần.
 */
export function SizeGrid({ stock, value, onChange, style }: SizeGridProps) {
  const sizes = useMemo(
    () => Object.keys(stock).sort((a, b) => Number(a) - Number(b)),
    [stock],
  );

  const tap = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  const setQty = (size: string, next: number) => {
    tap();
    const draft = { ...value };
    if (next <= 0) delete draft[size];
    else draft[size] = next;
    onChange(draft);
  };

  const fillSizeRun = () => {
    tap();
    const draft: SizeQty = {};
    sizes.forEach((size, i) => {
      const band = i < sizes.length / 3 ? "low" : i < (sizes.length * 2) / 3 ? "mid" : "high";
      const want = Math.min(SIZE_RUN[band] ?? 0, stock[size] ?? 0);
      if (want > 0) draft[size] = want;
    });
    onChange(draft);
  };

  return (
    <View style={[styles.wrap, style]}>
      <SectionHead title="Bảng size" style={styles.head} />
      <View style={styles.runRow}>
        <Chip label="⚡ Size Run" onPress={fillSizeRun} accessibilityLabel="Điền dải size chạy" />
        <T variant="micro" tone="muted" style={styles.hint}>
          Nhấn giữ dấu + để cộng {LONG_PRESS_STEP} đôi
        </T>
      </View>

      <View style={styles.grid}>
        {sizes.map((size) => {
          const available = stock[size] ?? 0;
          const soldOut = available <= 0;
          return (
            <View key={size} style={[styles.cell, soldOut && styles.cellSoldOut]}>
              <T variant="bodyStrong" tone={soldOut ? "faint" : "ink"}>{size}</T>
              <T variant="micro" tone={soldOut ? "danger" : "muted"}>
                {soldOut ? "hết" : `còn ${available}`}
              </T>
              {soldOut ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={14} color={color.faint} />
                </View>
              ) : (
                <Stepper
                  value={value[size] ?? 0}
                  max={available}
                  longPressStep={LONG_PRESS_STEP}
                  subject={`size ${size}`}
                  onChange={(n) => setQty(size, n)}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.x3 },
  head: { marginBottom: 0 },
  runRow: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  hint: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  // `flexGrow: 0` chứ không phải 1: cho giãn thì hàng CUỐI có ít ô hơn sẽ kéo
  // chúng rộng ra, nhìn thành hai cỡ ô khác nhau trong cùng một bảng.
  //
  // 31% để ba ô cộng hai khe 8px vẫn lọt: trên iPhone SE (lòng 335) ra 103.9/ô,
  // vừa đủ cho Stepper vốn cần tối thiểu 102 (36 + 26 + 36 + 4). Cũng vì vậy ô
  // KHÔNG có lề ngang — thêm vào là nút bị bóp méo.
  cell: {
    flexBasis: "31%", flexGrow: 0, alignItems: "center",
    paddingVertical: space.x3, gap: space.x1,
  },
  cellSoldOut: { opacity: 0.6 },
  lock: { height: 40, alignItems: "center", justifyContent: "center" },
});

import { useMemo } from "react";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import { Text, colors, radius, space } from "@/theme";

export type SizeQty = Record<string, number>;

interface Props {
  /** size -> tồn kho khả dụng */
  stock: Record<string, number>;
  value: SizeQty;
  onChange: (next: SizeQty) => void;
  unitPrice: number;
}

/** Dải size "chạy" mặc định cho lệnh đặt nhanh: mỗi size vài đôi, ưu tiên size giữa. */
const SIZE_RUN: Record<string, number> = { low: 2, mid: 4, high: 2 };

/**
 * Bảng size — màn hình đặc trưng của bán sỉ, và là màn được dùng nhiều nhất.
 *
 * Bốn điều làm khác bản thiết kế gốc, đều xuất phát từ việc đây là app cầm tay:
 *  1. Nút +/- thay cho ô nhập số. Gõ số trên bàn phím điện thoại cho một lưới 8 size
 *     là việc chậm và dễ sai; đại lý thường cộng dồn từng ít một.
 *  2. Tồn kho hiện ngay dưới mỗi size, và size hết hàng bị khoá rõ ràng thay vì
 *     cho bấm rồi mới báo lỗi.
 *  3. Chạm giữ vào dấu + cộng 5 đôi — bước nhảy quen thuộc khi đặt sỉ.
 *  4. "Size Run" điền sẵn cả dải theo phân bố thường gặp (size giữa nhiều hơn),
 *     vì phần lớn đơn sỉ bắt đầu từ một dải chuẩn rồi mới chỉnh.
 */
export function SizeMatrix({ stock, value, onChange, unitPrice }: Props) {
  const sizes = useMemo(
    () => Object.keys(stock).sort((a, b) => Number(a) - Number(b)),
    [stock],
  );

  const totalPairs = Object.values(value).reduce((s, n) => s + n, 0);

  const tap = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const bump = (size: string, delta: number) => {
    const available = stock[size] ?? 0;
    const next = Math.min(Math.max((value[size] ?? 0) + delta, 0), available);
    if (next === (value[size] ?? 0)) {
      return;
    }
    tap();
    const draft = { ...value };
    if (next === 0) {
      delete draft[size];
    } else {
      draft[size] = next;
    }
    onChange(draft);
  };

  const fillSizeRun = () => {
    tap();
    const draft: SizeQty = {};
    sizes.forEach((size, i) => {
      const band = i < sizes.length / 3 ? "low" : i < (sizes.length * 2) / 3 ? "mid" : "high";
      const want = Math.min(SIZE_RUN[band] ?? 0, stock[size] ?? 0);
      if (want > 0) {
        draft[size] = want;
      }
    });
    onChange(draft);
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.header}>
        <Text variant="h3">Bảng size</Text>
        <Pressable onPress={fillSizeRun} style={styles.runBtn} accessibilityRole="button">
          <Ionicons name="flash-outline" size={15} color={colors.brand[500]} />
          <Text variant="label" color={colors.brand[500]}>Size Run</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {sizes.map((size) => {
          const available = stock[size] ?? 0;
          const qty = value[size] ?? 0;
          const soldOut = available <= 0;
          const maxed = qty >= available;

          return (
            <View
              key={size}
              style={[
                styles.cell,
                qty > 0 ? styles.cellActive : null,
                soldOut ? styles.cellSoldOut : null,
              ]}
            >
              <Text variant="bodyLg" weight="700" color={soldOut ? colors.textFaint : colors.text}>
                {size}
              </Text>
              <Text variant="micro" color={soldOut ? colors.danger.fg : colors.textMuted}>
                {soldOut ? "hết" : `còn ${available}`}
              </Text>

              <View style={styles.stepper}>
                <Step icon="remove" onPress={() => bump(size, -1)} disabled={qty <= 0} />
                <Text
                  variant="bodyLg"
                  weight="700"
                  color={qty > 0 ? colors.brand[500] : colors.textFaint}
                  style={styles.qty}
                >
                  {qty}
                </Text>
                <Step
                  icon="add"
                  onPress={() => bump(size, 1)}
                  onLongPress={() => bump(size, 5)}
                  disabled={soldOut || maxed}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Thanh tổng kết nền đậm: MỌI chữ ở đây phải chỉ màu sáng tường minh.
          Màu chữ mặc định là slate đậm — để mặc định thì chữ biến mất trên nền đậm. */}
      <View style={styles.summary}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.slate[400]}>Đã chọn</Text>
          <Text variant="h3" color={colors.textOnBrand}>{totalPairs} đôi</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text variant="caption" color={colors.slate[400]}>Thành tiền</Text>
          <Text variant="h3" color={colors.brand[400]}>{vnd(totalPairs * unitPrice)}</Text>
        </View>
      </View>
    </View>
  );
}

function Step({
  icon, onPress, onLongPress, disabled,
}: {
  icon: "add" | "remove";
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={icon === "add" ? "Tăng" : "Giảm"}
      // Vùng chạm nới rộng ra ngoài hình vẽ: nút 28px là dưới ngưỡng 44px khuyến nghị,
      // nhưng lưới 8 size không đủ chỗ cho nút to hơn.
      hitSlop={10}
      style={({ pressed }) => [
        styles.step,
        disabled ? styles.stepDisabled : null,
        pressed && !disabled ? { backgroundColor: colors.brand.tint } : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={disabled ? colors.slate[300] : colors.slate[700]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.tint,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cell: {
    width: "31.5%",
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  cellActive: { borderColor: colors.brand[500], backgroundColor: colors.brand.tintSoft },
  cellSoldOut: { backgroundColor: colors.surfaceSunken, borderStyle: "dashed" },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.xs },
  step: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSunken,
  },
  stepDisabled: { opacity: 0.4 },
  qty: { minWidth: 26, textAlign: "center" },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.slate[900],
  },
});

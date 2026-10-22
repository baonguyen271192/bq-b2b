import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable, StyleSheet, TextInput, View, type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, hitSize, radius, text } from "@/theme";
import { Num } from "./Num";

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Chặn trên — số tồn kho của size đó. */
  max?: number;
  /** Hết hàng: cả hai nút vô hiệu, khối mờ đi. */
  soldOut?: boolean;
  /** Gọi khi người dùng gõ số lớn hơn `max` — để màn hiện "báo nhẹ" (toast). */
  onExceedMax?: (max: number) => void;
  /** Mô tả cái đang đếm, vd "size 39" → "Tăng số lượng size 39". */
  subject: string;
  style?: ViewStyle;
}

/** Trễ trước khi nhấn-giữ bắt đầu lặp. */
const HOLD_DELAY = 400;
/** Nhịp lặp ban đầu, và nhịp sau khi đã giữ quá {@link ACCELERATE_AFTER}. */
const REPEAT_MS = 120;
const FAST_MS = 50;
const ACCELERATE_AFTER = 1000;

/**
 * Bộ −/+ cao 44, mỗi nút 44 (SPEC §2).
 *
 * Hai thứ ở đây không phải trang trí mà là yêu cầu nghiệp vụ: đại lý đặt sỉ
 * thường nhập 8–20 đôi một size, nên
 *
 *  1. **chạm vào con số mở bàn phím số** — 12 lần bấm (+) cho một size là không
 *     chấp nhận được;
 *  2. **giữ nút thì lặp, và nhanh dần sau 1 giây** — lặp đều tốc độ thì giữ 20
 *     đôi vẫn mất 2.4 giây.
 *
 * Giá trị vượt tồn kho bị hạ về đúng tồn kho và báo qua `onExceedMax`: chặn
 * cứng ở bàn phím (không cho gõ) khiến người dùng tưởng phím hỏng.
 */
export function Stepper({
  value, onChange, max, soldOut, onExceedMax, subject, style,
}: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Đọc trong callback của timer nên phải là ref: biến đóng của `value` luôn
   *  là bản tại lúc gắn timer. Cập nhật trong effect chứ không trong thân
   *  render — React 19 cấm ghi ref lúc render. */
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);

  const active = value > 0;
  const canAdd = !soldOut && (max === undefined || value < max);
  const canSub = !soldOut && value > 0;

  const clamp = useCallback(
    (n: number) => Math.max(0, max === undefined ? n : Math.min(max, n)),
    [max],
  );

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (interval.current) clearInterval(interval.current);
    timer.current = null;
    interval.current = null;
  }, []);

  // Giữ nút rồi rời màn hình (điều hướng, sheet đóng) thì timer vẫn chạy và gọi
  // onChange trên component đã gỡ. Dọn ở đây là bắt buộc, không phải cẩn thận thừa.
  useEffect(() => stop, [stop]);

  const startHold = (delta: number) => {
    stop();
    timer.current = setTimeout(() => {
      const startedAt = Date.now();
      let fast = false;
      const tick = () => {
        const next = clamp(latest.current + delta);
        if (next === latest.current) { stop(); return; }
        onChange(next);
        if (!fast && Date.now() - startedAt >= ACCELERATE_AFTER) {
          fast = true;
          if (interval.current) clearInterval(interval.current);
          interval.current = setInterval(tick, FAST_MS);
        }
      };
      interval.current = setInterval(tick, REPEAT_MS);
    }, HOLD_DELAY);
  };

  const step = (delta: number) => {
    const next = clamp(value + delta);
    if (next !== value) onChange(next);
  };

  const commitDraft = () => {
    setEditing(false);
    const parsed = Number.parseInt(draft.replace(/\D/g, ""), 10);
    const wanted = Number.isNaN(parsed) ? 0 : parsed;
    if (max !== undefined && wanted > max) onExceedMax?.(max);
    const next = clamp(wanted);
    if (next !== value) onChange(next);
  };

  return (
    <View
      style={[
        styles.wrap,
        soldOut ? styles.soldOut : active ? styles.active : styles.idle,
        style,
      ]}
    >
      <Pressable
        onPress={() => step(-1)}
        onPressIn={() => canSub && startHold(-1)}
        onPressOut={stop}
        disabled={!canSub}
        accessibilityRole="button"
        accessibilityLabel={`Giảm số lượng ${subject}`}
        accessibilityState={{ disabled: !canSub }}
        style={styles.btn}
      >
        <Ionicons name="remove" size={20} color={canSub ? color.ink : color.muted} />
      </Pressable>

      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
          autoFocus
          accessibilityLabel={`Số lượng ${subject}`}
          style={[text("cardTitle", { weight: "bold", tabular: true }), styles.value]}
        />
      ) : (
        <Pressable
          onPress={() => { if (!soldOut) { setDraft(String(value)); setEditing(true); } }}
          disabled={soldOut}
          accessibilityRole="button"
          accessibilityLabel={`Số lượng ${subject}: ${value}. Chạm để nhập số.`}
          style={styles.valueTap}
        >
          <Num variant="cardTitle" weight="bold" tone={active ? "ink" : "muted"} style={styles.value}>
            {value}
          </Num>
        </Pressable>
      )}

      <Pressable
        onPress={() => step(1)}
        onPressIn={() => canAdd && startHold(1)}
        onPressOut={stop}
        disabled={!canAdd}
        accessibilityRole="button"
        accessibilityLabel={`Tăng số lượng ${subject}`}
        accessibilityState={{ disabled: !canAdd }}
        style={styles.btn}
      >
        <Ionicons name="add" size={20} color={canAdd ? color.ink : color.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", height: hitSize, borderRadius: radius.pill },
  idle: { backgroundColor: color.subtle },
  active: { backgroundColor: color.paper, borderWidth: 1.5, borderColor: color.ink },
  soldOut: { backgroundColor: color.subtle, opacity: 0.55 },
  btn: {
    width: hitSize, height: hitSize, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  valueTap: { minWidth: 32, height: hitSize, alignItems: "center", justifyContent: "center" },
  value: { minWidth: 32, textAlign: "center", padding: 0 },
});

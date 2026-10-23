import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { color, fontFamily, radius, space, textStyle } from "@/theme";
import { BottomSheet, Chip, Pill, T } from "../ui";

/**
 * Giới hạn ký tự = giới hạn trường `Comments` của SAP B1 (254).
 *
 * Chặn ở đây thay vì để backend cắt: đại lý gõ 300 ký tự rồi mất 46 ký tự cuối
 * mà không ai báo là mất đúng phần dặn dò quan trọng nhất, thường nằm ở cuối.
 */
export const NOTE_MAX = 254;

/** Chip chèn nhanh những dặn dò hay gặp nhất (SPEC §3.30). */
const SUGGESTIONS = ["Giao buổi sáng", "Gọi trước khi giao", "Giao giờ hành chính"];

export interface NoteSheetProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSave: (note: string) => void;
}

/**
 * Sheet "Ghi chú cho BQ" (SPEC §3.30) — dùng chung cho Giỏ hàng và Chi tiết đơn.
 *
 * Dựng lại thân sheet theo `key` mỗi lần mở: nội dung đang gõ dở của lần mở
 * trước không được dính sang lần sau.
 */
export function NoteSheet({ visible, onClose, value, onSave }: NoteSheetProps) {
  if (!visible) return null;
  return <NoteSheetBody key={value} onClose={onClose} value={value} onSave={onSave} />;
}

function NoteSheetBody({ onClose, value, onSave }: Omit<NoteSheetProps, "visible">) {
  const [text, setText] = useState(value);

  const append = (s: string) => {
    setText((prev) => {
      const base = prev.trim();
      if (base.toLowerCase().includes(s.toLowerCase())) return prev;
      return (base ? `${base}, ${s}` : s).slice(0, NOTE_MAX);
    });
  };

  return (
    <BottomSheet visible onClose={onClose} title="Ghi chú cho BQ">
      <View style={styles.body}>
        <T variant="label" weight="regular" tone="muted">
          Dặn dò về giao hàng, hoá đơn… Sale và kho BQ đều đọc được.
        </T>

        <TextInput
          value={text}
          onChangeText={(v) => setText(v.slice(0, NOTE_MAX))}
          multiline
          textAlignVertical="top"
          placeholder="Ví dụ: Giao buổi sáng, gọi trước 30 phút"
          placeholderTextColor={color.muted}
          accessibilityLabel="Ghi chú cho BQ"
          style={styles.input}
        />
        <T variant="small" tone="muted" style={styles.count}>{`${text.length}/${NOTE_MAX}`}</T>

        <View style={styles.chips}>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} variant="filter" onPress={() => append(s)} />
          ))}
        </View>

        <Pill label="Lưu ghi chú" onPress={() => onSave(text.trim())} style={styles.cta} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.x3, paddingBottom: space.x5 },
  input: {
    minHeight: 112, borderRadius: radius.field, borderWidth: 1.5, borderColor: color.ink,
    paddingHorizontal: space.x4, paddingVertical: space.x3,
    fontFamily: fontFamily.regular,
    fontSize: textStyle.body.fontSize,
    lineHeight: textStyle.body.lineHeight,
    color: color.ink,
  },
  count: { textAlign: "right", marginTop: -space.x2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  cta: { marginTop: space.x2 },
});

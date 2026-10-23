import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { BottomSheet } from "./BottomSheet";
import { SearchField } from "./SearchField";
import { T } from "./T";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  /** Tiêu đề sheet chọn. Bỏ trống thì lấy `placeholder`. */
  sheetTitle?: string;
  /** Vô hiệu khi chưa chọn cấp trên (Phường/Xã chờ Tỉnh/TP). */
  disabled?: boolean;
  /** Lý do bị vô hiệu, hiện dưới ô: "Chọn tỉnh/thành phố trước". */
  disabledHint?: string;
  style?: ViewStyle;
}

/**
 * Ô chọn từ danh sách (SPEC §2) — Tỉnh/Thành phố, Phường/Xã.
 *
 * Sheet chọn LUÔN có ô tìm kiếm, không phải tuỳ chọn: sau khi bỏ cấp huyện,
 * một tỉnh có thể có vài trăm phường/xã và cả nước có hàng nghìn. Cuộn tay qua
 * danh sách đó là không dùng được.
 */
export function Select({
  label, value, options, onChange, placeholder, sheetTitle,
  disabled, disabledHint, style,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <View style={style}>
      {label ? <T variant="label" weight="semibold" style={styles.label}>{label}</T> : null}
      <Pressable
        onPress={() => { setQ(""); setOpen(true); }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selected?.label ?? placeholder}` : placeholder}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={[styles.field, disabled && styles.disabled]}
      >
        {/* Cho xuống 2 dòng thay vì cắt (SPEC §5-N.11): tên phường/xã tiếng
            Việt thường dài, cắt đi thì đại lý không biết mình đã chọn đúng chưa. */}
        <T variant="body" tone={selected ? "ink" : "muted"} numberOfLines={2} style={styles.value}>
          {selected?.label ?? placeholder}
        </T>
        <Ionicons name="chevron-down" size={18} color={color.ink} />
      </Pressable>
      {disabled && disabledHint ? (
        <T variant="small" tone="muted" style={styles.hint}>{disabledHint}</T>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? placeholder}>
        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder="Tìm nhanh"
          accessibilityLabel={`Tìm trong ${sheetTitle ?? placeholder}`}
        />
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <T variant="small" tone="muted" style={styles.empty}>
              {`Không tìm thấy “${q}”`}
            </T>
          ) : (
            filtered.map((o, i) => (
              <Pressable
                key={o.value}
                onPress={() => { onChange(o.value); setOpen(false); }}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                accessibilityState={{ selected: o.value === value }}
                style={[styles.option, i < filtered.length - 1 && styles.optionDivider]}
              >
                <T variant="bodyStrong" weight={o.value === value ? "semibold" : "regular"}>
                  {o.label}
                </T>
                {o.value === value ? (
                  <Ionicons name="checkmark" size={20} color={color.ink} />
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space.x2 },
  field: {
    // `minHeight` chứ không `height`: nhãn hai dòng phải nở ô ra, không bị bóp.
    minHeight: 52, borderRadius: radius.field, borderWidth: 1, borderColor: color.line,
    backgroundColor: color.paper, flexDirection: "row", alignItems: "center",
    paddingHorizontal: space.x4, paddingVertical: space.x2, gap: space.x2,
  },
  value: { flex: 1 },
  disabled: { opacity: 0.5 },
  hint: { marginTop: space.x1 },
  list: { marginTop: space.x3, maxHeight: 420 },
  option: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    minHeight: 52, paddingVertical: 14,
  },
  optionDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  empty: { paddingVertical: space.x6, textAlign: "center" },
});

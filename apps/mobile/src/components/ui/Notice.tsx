import { StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export type NoticeKind = "info" | "warn" | "danger" | "ok" | "plain";

export interface NoticeProps {
  children: string;
  kind?: NoticeKind;
  style?: ViewStyle;
}

const KIND = {
  info: { bg: color.infoTint, fg: color.info, icon: "information-circle" },
  warn: { bg: color.warnTint, fg: color.warn, icon: "alert-circle" },
  danger: { bg: color.dangerTint, fg: color.danger, icon: "close-circle" },
  ok: { bg: color.okTint, fg: color.ok, icon: "checkmark-circle" },
  /** Nền paper, viền line — ghi chú hướng dẫn, không phải trạng thái (SPEC §3.13). */
  plain: { bg: color.paper, fg: color.muted, icon: "information-circle-outline" },
} as const;

/**
 * Băng thông báo trong luồng nội dung.
 *
 * Chữ dùng tone `ink` chứ không phải màu của trạng thái: chữ cùng màu với icon
 * trên nền tint cùng tông thì tương phản tụt xuống quanh 3:1 — đủ cho một nhãn
 * ngắn, không đủ cho hai dòng giải thích. Màu trạng thái dồn hết vào icon và nền.
 */
export function Notice({ children, kind = "info", style }: NoticeProps) {
  const k = KIND[kind];
  return (
    <View style={[styles.wrap, { backgroundColor: k.bg }, kind === "plain" && styles.plain, style]}>
      <Ionicons name={k.icon} size={20} color={k.fg} />
      <T variant="small" style={styles.text}>{children}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "flex-start", gap: space.x3,
    padding: space.x4, borderRadius: radius.field,
  },
  plain: { borderWidth: 1, borderColor: color.line },
  text: { flex: 1 },
});

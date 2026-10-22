import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface ChatBubbleProps {
  children: string;
  /** `me` nền ink căn phải · `bot` nền paper căn trái. */
  from: "me" | "bot";
  style?: ViewStyle;
}

/**
 * Bong bóng chat của trợ lý (SPEC §3.12).
 *
 * Bong bóng của mình nền INK chứ không cam: màn này không có mảng cam nào khác,
 * và cam ở đây sẽ đá nhau với nút gửi cam ở ô nhập ngay bên dưới. Chữ trắng
 * trên ink đạt 17.51:1 nên không phải ép weight như hồi dùng nền cam.
 *
 * Góc bo lệch về phía người nói (SPEC: bot `20 20 20 6`, mình `20 20 6 20`) —
 * đó là tín hiệu hướng, không chỉ trang trí.
 */
export function ChatBubble({ children, from, style }: ChatBubbleProps) {
  const mine = from === "me";
  return (
    <View style={[styles.base, mine ? styles.mine : styles.theirs, style]}>
      <T variant="body" tone={mine ? "white" : "ink"}>{children}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { padding: space.x4, borderRadius: radius.action },
  theirs: {
    alignSelf: "flex-start", maxWidth: "82%",
    backgroundColor: color.paper, borderBottomLeftRadius: 6,
  },
  mine: {
    alignSelf: "flex-end", maxWidth: "78%",
    backgroundColor: color.ink, borderBottomRightRadius: 6,
  },
});

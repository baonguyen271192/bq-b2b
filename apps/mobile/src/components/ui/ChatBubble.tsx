import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius, space } from "@/theme";
import { T } from "./T";

export interface ChatBubbleProps {
  children: string;
  /** `me` nền cam căn phải · `bot` nền trắng căn trái. */
  from: "me" | "bot";
  style?: ViewStyle;
}

/**
 * Bong bóng chat của trợ lý.
 *
 * Bong bóng của MÌNH nặng hơn bong bóng của bot một bậc weight, và đó không
 * phải lựa chọn thẩm mỹ: nền cam `bq` cho chữ trắng 3.56:1, chỉ hợp lệ khi cỡ
 * >= 15px VÀ weight >= 600. Bậc `body` đạt 15px nhưng mặc định là regular, nên
 * phải ép lên `semibold`. Bong bóng của bot nền trắng, chữ ink, không vướng.
 */
export function ChatBubble({ children, from, style }: ChatBubbleProps) {
  const mine = from === "me";
  return (
    <View style={[styles.base, mine ? styles.mine : styles.theirs, style]}>
      <T variant="body" weight={mine ? "semibold" : "regular"} tone={mine ? "white" : "ink"}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { maxWidth: "88%", padding: space.x3, borderRadius: radius.card },
  theirs: { alignSelf: "flex-start", backgroundColor: color.paper, borderBottomLeftRadius: radius.chip },
  mine: { alignSelf: "flex-end", backgroundColor: color.bq, borderBottomRightRadius: radius.chip },
});

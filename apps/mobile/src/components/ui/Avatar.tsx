import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius } from "@/theme";
import { T } from "./T";

export interface AvatarProps {
  /** Lấy tối đa hai chữ cái đầu làm nội dung. */
  name: string;
  /** 44 ở header Trang chủ và dòng Sale, 60 ở card đại lý màn Hồ sơ. */
  size?: 40 | 44 | 60;
  /** `info` cho avatar Sale phụ trách (SPEC §3.11). */
  tone?: "ink" | "info";
  style?: ViewStyle;
}

/** "Đại lý Minh Phát" -> "MP". Bỏ tiền tố "Đại lý"/"Cửa hàng" cho khỏi ra "ĐL". */
function initials(name: string): string {
  const words = name
    .replace(/^(đại lý|cửa hàng|công ty)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const pick = words.length === 1 ? [words[0]] : [words[words.length - 2], words[words.length - 1]];
  return pick.map((w) => w[0]).join("").toUpperCase();
}

/**
 * Vòng tròn chữ cái đầu (SPEC §3.2, §3.11).
 *
 * Nền INK chứ không cam: avatar nằm cạnh thẻ hạn mức cam, hai mảng cam cạnh
 * nhau thì không mảng nào còn là điểm nhấn.
 */
export function Avatar({ name, size = 44, tone = "ink", style }: AvatarProps) {
  const info = tone === "info";
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: info ? color.infoTint : color.ink },
        style,
      ]}
      accessibilityLabel={name}
    >
      <T
        variant={size >= 60 ? "title" : "bodyStrong"}
        weight="bold"
        tone={info ? "info" : "white"}
      >
        {initials(name)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});

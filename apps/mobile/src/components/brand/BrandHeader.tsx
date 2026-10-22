import { StyleSheet, View, type ViewStyle } from "react-native";
import { color, radius } from "@/theme";
import { T } from "../ui";

export interface BrandHeaderProps {
  style?: ViewStyle;
}

/** Cao 280 theo SPEC §3.1 — xuất ra để màn Đăng nhập tính padding nội dung. */
export const BRAND_HEADER_H = 280;

/**
 * Mảng cam đầu màn Đăng nhập (SPEC §3.1).
 *
 * Nền `flame` chứ không `brand`, và đó là ràng buộc CHỨC NĂNG chứ không thẩm mỹ:
 * mảng này phải khớp màu nền và vị trí logo với splash để lúc splash thoát,
 * người dùng không thấy một bước nhảy màu. Cả hai cùng đọc một token `flame`.
 *
 * Bên trong chỉ có chữ "BQ" 72px — đó là lý do duy nhất khiến chữ trắng ở đây
 * hợp lệ trên `flame` (3.56:1 chỉ đạt với chữ lớn).
 */
export function BrandHeader({ style }: BrandHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      {/* Hai vòng tròn viền trắng mờ, tâm phía trên — hoạ tiết nhận diện. */}
      <View style={[styles.ring, styles.ringBig]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringSmall]} pointerEvents="none" />
      <View style={styles.stitch} pointerEvents="none" />
      <T variant="screenTitle" tone="white" style={styles.mark}>BQ</T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: BRAND_HEADER_H,
    backgroundColor: color.flame,
    borderBottomLeftRadius: radius.loginHeader,
    borderBottomRightRadius: radius.loginHeader,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    position: "absolute", borderWidth: 1, borderColor: color.white,
    borderRadius: radius.pill,
  },
  ringBig: { width: 520, height: 520, top: -300, opacity: 0.14 },
  ringSmall: { width: 360, height: 360, top: -220, opacity: 0.18 },
  /**
   * Chỉ khâu chạy theo MÉP DƯỚI (SPEC §3.1), nên bỏ hẳn viền trên: để cả bốn
   * cạnh thì hoạ tiết thành một cái khung bao quanh logo, khác hẳn ý đồ.
   */
  stitch: {
    position: "absolute", left: 10, right: 10, bottom: 10, top: 10,
    borderBottomLeftRadius: radius.loginHeader - 10,
    borderBottomRightRadius: radius.loginHeader - 10,
    borderWidth: 1, borderTopWidth: 0,
    borderStyle: "dashed", borderColor: color.whiteA(0.32),
  },
  /**
   * 72/800 letterSpacing -4, lệch xuống 24 — khớp vị trí logo của splash.
   * Bậc `screenTitle` là 30 nên phải ghi đè cỡ tại đây; đây là logo, không phải
   * chữ trong thang chữ.
   */
  mark: { fontSize: 72, lineHeight: 84, letterSpacing: -4, marginTop: 24 },
});

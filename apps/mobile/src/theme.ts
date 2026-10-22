/**
 * Lớp ánh xạ design token sang React Native.
 *
 * Giá trị thật nằm ở `@bq/tokens` (TS thuần, dùng chung với web). File này CHỈ
 * biến chúng thành thứ RN hiểu được — và là nơi duy nhất được phép biết RN tồn
 * tại. Screen và component lấy mọi thứ từ đây.
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";
import {
  color,
  fontFamily,
  hitSize,
  radius,
  space,
  textStyle,
  type FontWeightToken,
  type TextStyleToken,
} from "@bq/tokens";

export { color, fontFamily, hitSize, radius, space, textStyle };
export type { FontWeightToken, TextStyleToken };

/**
 * Style chữ hoàn chỉnh cho RN.
 *
 * `weight` đi qua TÊN FONT chứ không qua `fontWeight`: Android bỏ qua
 * `fontWeight` khi dùng font tuỳ biến, nên khai số ở đó sẽ ra chữ mảnh trên
 * Android mà iOS vẫn đúng — lỗi chỉ lộ trên máy thật.
 *
 * `tabular` BẮT BUỘC cho tiền, số lượng, mã đơn và ngày (SPEC §1): thiếu nó thì
 * các con số trong một cột nhảy ngang khi giá trị đổi.
 */
export function text(
  token: TextStyleToken,
  opts?: { weight?: FontWeightToken; tabular?: boolean },
): TextStyle {
  const t = textStyle[token];
  return {
    fontFamily: fontFamily[opts?.weight ?? (t.weight as FontWeightToken)],
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    color: color.ink,
    // Khai một lần trong object literal: `fontVariant` của TextStyle là
    // ReadonlyArray nên gán sau khi tạo sẽ không biên dịch được.
    ...(opts?.tabular ? { fontVariant: ["tabular-nums"] as const } : null),
  };
}

/**
 * Đổ bóng — CHỈ ba chỗ này (SPEC §1). Card thường không có shadow: nó tách khỏi
 * nền bằng `paper` trên `canvas`. Rắc shadow lên mọi card làm màn hình trông
 * đục và mất hẳn cảm giác phân cấp.
 *
 * Khai cả `shadow*` (iOS) lẫn `elevation` (Android): thiếu một bên là một nền
 * tảng phẳng lì.
 */
export const shadow: Record<"tabBar" | "dock" | "segment", ViewStyle> = {
  /** Tab bar viên thuốc nổi. `0 12 32 rgba(28,25,21,0.28)`. */
  tabBar: {
    shadowColor: color.ink,
    shadowOpacity: 0.28,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  /** Dock đáy — bóng hắt LÊN. `0 -8 28 rgba(28,25,21,0.10)`. */
  dock: {
    shadowColor: color.ink,
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  /** Tab đang chọn trong SegmentedControl. `0 1 3 rgba(28,25,21,0.08)`. */
  segment: {
    shadowColor: color.ink,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
};

/**
 * Vùng chạm tối thiểu 44. Dùng cho phần tử nhỏ hơn 44 về mặt thị giác.
 */
export function hitSlopFor(visualSize: number) {
  const pad = Math.max(0, Math.ceil((hitSize - visualSize) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
}

/**
 * Chữ trắng trên `flame` chỉ đạt 3.56:1 → chỉ hợp lệ khi là "chữ lớn" theo
 * WCAG: ≥ 24px, hoặc ≥ 18.66px khi in đậm.
 *
 * Trên `brand` thì KHÔNG cần kiểm: 4.79:1 đã đạt AA cho cả chữ thường — đó
 * chính là lý do SPEC mục 5.A tách hai sắc cam ra.
 */
export const onFlameTextIsLegible = (fontSize: number, weight: FontWeightToken) =>
  fontSize >= 24 || (fontSize >= 18.66 && weight !== "regular" && weight !== "medium");

/** Android cắt chữ có lineHeight sát fontSize; cộng thêm 1px cho chắc. */
export const lineHeightFix = Platform.OS === "android" ? 1 : 0;

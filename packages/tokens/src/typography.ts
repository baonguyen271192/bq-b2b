/**
 * Họ font Be Vietnam Pro. Tên khớp với khoá `useFonts` của
 * `@expo-google-fonts/be-vietnam-pro` — đổi một bên phải đổi cả hai.
 */
export const fontFamily = {
  regular: "BeVietnamPro_400Regular",
  medium: "BeVietnamPro_500Medium",
  semibold: "BeVietnamPro_600SemiBold",
  bold: "BeVietnamPro_700Bold",
  extrabold: "BeVietnamPro_800ExtraBold",
} as const;

export type FontWeightToken = keyof typeof fontFamily;

/**
 * Thang chữ. `weight` là khoá trong {@link fontFamily}, KHÔNG phải số —
 * Android bỏ qua `fontWeight` khi dùng font tuỳ biến, nên weight phải đi qua
 * tên file font.
 */
export const textStyle = {
  display: { fontSize: 34, lineHeight: 38, weight: "extrabold", letterSpacing: -1.2 },
  title: { fontSize: 24, lineHeight: 30, weight: "bold", letterSpacing: -0.5 },
  heading: { fontSize: 18, lineHeight: 24, weight: "bold", letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, weight: "regular", letterSpacing: 0 },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: "semibold", letterSpacing: 0 },
  small: { fontSize: 13, lineHeight: 18, weight: "medium", letterSpacing: 0 },
  micro: { fontSize: 11, lineHeight: 14, weight: "semibold", letterSpacing: 0.2 },
} as const;

export type TextStyleToken = keyof typeof textStyle;

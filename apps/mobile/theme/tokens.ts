/**
 * Design tokens của BQ, rút từ prototype `BQ Dealer App.html`.
 *
 * Nguyên tắc: KHÔNG viết màu/khoảng cách thẳng trong component. Mọi giá trị đi qua
 * đây để đổi nhận diện một lần là đổi cả app — và để người tiếp quản nhìn một file
 * là nắm hết ngôn ngữ thị giác.
 */

/** Cam thương hiệu. Dùng cho hành động chính và số liệu cần chú ý — không dùng làm nền lớn. */
const brand = {
  500: "#E65C00",
  600: "#D14F00",
  400: "#EA6A14",
  tint: "#FFF1E6",
  tintSoft: "#FFF8F3",
  ring: "#FDEBDD",
} as const;

/** Thang xám trung tính (họ slate) — nền, chữ, viền. */
const slate = {
  900: "#0F172A",
  700: "#334155",
  600: "#475569",
  500: "#64748B",
  400: "#94A3B8",
  300: "#CBD5E1",
  200: "#E2E8F0",
  150: "#E7EAEE",
  100: "#F1F5F9",
  75: "#EEF1F5",
  50: "#F7F8FA",
} as const;

export const colors = {
  brand,
  slate,

  /** Nền toàn app. Hơi xám để thẻ trắng nổi lên. */
  bg: slate[50],
  surface: "#FFFFFF",
  surfaceSunken: slate[100],
  border: slate[200],
  borderStrong: slate[300],

  text: slate[900],
  textMuted: slate[500],
  textFaint: slate[400],
  textOnBrand: "#FFFFFF",

  /** Trạng thái. Mỗi cặp gồm chữ + nền nhạt để làm nhãn (badge). */
  success: { fg: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
  warning: { fg: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
  danger: { fg: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  info: { fg: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  neutral: { fg: slate[600], bg: slate[100], border: slate[200] },
} as const;

/** Bậc 4px. Dùng số, không dùng chuỗi, để TypeScript bắt lỗi khoảng cách tuỳ tiện. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 999,
} as const;

/**
 * Thang chữ. Prototype dùng 11–32; gom lại thành thang có tên để dùng nhất quán.
 * `lineHeight` đặt sẵn vì tiếng Việt có dấu, để mặc định sẽ bị cắt dấu ở một số máy.
 */
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "800" },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "700" },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: "600" },
} as const;

/** Họ font Inter, nạp trong app/_layout.tsx. */
export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

/** Ánh xạ fontWeight -> tên font thật. RN trên Android KHÔNG tự chọn weight đúng. */
export const fontForWeight: Record<string, string> = {
  "400": font.regular,
  "500": font.medium,
  "600": font.semibold,
  "700": font.bold,
  "800": font.extrabold,
};

/** Bóng đổ nhạt, ám màu slate thay vì đen thuần — đen thuần làm giao diện bị "bẩn". */
export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  brand: {
    shadowColor: brand[500],
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

import type { Ionicons } from "@expo/vector-icons";
import { color } from "@/theme";
import { statusKindFor } from "./StatusTag";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Icon theo BƯỚC THẬT của đơn.
 *
 * Trước đây mọi đơn đều vẽ icon xe tải nền xanh, kể cả đơn còn đang "Chờ duyệt"
 * — chưa ai xác nhận, chưa xuất kho, mà hình thì đã chạy trên đường.
 */
export function statusIconFor(status: string): IconName {
  const s = status.toLowerCase();
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("từ chối")) return "close-circle-outline";
  if (s.includes("đã nhận") || s.includes("hoàn tất")) return "checkmark-circle-outline";
  if (s.includes("đóng gói")) return "cube-outline";
  if (s.includes("giao")) return "car-outline";
  // Còn lại là khúc đầu: "Chờ xác nhận", "Chờ duyệt", "Đã xác nhận".
  return "time-outline";
}

/** Màu icon + nền tròn, lấy cùng bảng màu với {@link statusKindFor}. */
export function statusColorsFor(status: string): { fg: string; bg: string } {
  switch (statusKindFor(status)) {
    case "ok": return { fg: color.ok, bg: color.okTint };
    case "warn": return { fg: color.warn, bg: color.warnTint };
    case "danger": return { fg: color.danger, bg: color.dangerTint };
    case "info": return { fg: color.info, bg: color.infoTint };
    default: return { fg: color.muted, bg: color.subtle };
  }
}

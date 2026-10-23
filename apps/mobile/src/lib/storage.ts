import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lưu trữ cục bộ cho những thứ KHÔNG phải bí mật: giỏ hàng, mẫu đã lưu, lịch sử
 * tìm kiếm. Mã phiên đi đường riêng — xem `src/lib/secure.ts`.
 *
 * Mọi hàm ở đây NUỐT lỗi và trả giá trị trống. Đọc hỏng một mục yêu thích không
 * đáng để app không mở được; chỗ gọi luôn có đường đi khi không có dữ liệu cũ.
 */

/** Khoá có đánh số phiên bản: đổi cấu trúc thì tăng số, dữ liệu cũ tự bị bỏ qua. */
export const STORE_KEYS = {
  cart: "bq.cart.v1",
  favourites: "bq.favourites.v1",
  searchHistory: "bq.search-history.v1",
  drafts: "bq.drafts.v1",
} as const;

export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Hết dung lượng hoặc trình duyệt chặn — giỏ vẫn còn trong bộ nhớ phiên này.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Không xoá được thì lần đọc sau vẫn ra dữ liệu cũ; chỗ gọi tự xử lý.
  }
}

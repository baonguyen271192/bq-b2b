import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { loadJson, removeKey, saveJson } from "./storage";

/**
 * Mã phiên đăng nhập.
 *
 * Native dùng `expo-secure-store` (Keychain trên iOS, Keystore trên Android).
 * Web KHÔNG có kho bảo mật tương đương và `expo-secure-store` không chạy ở đó,
 * nên rơi về `AsyncStorage` — chấp nhận được vì bản web chỉ dùng để soi giao
 * diện, không phải bản phát hành cho đại lý.
 */
const KEY = "bq.session.v1";

export interface StoredSession {
  dealerCode: string;
}

export async function loadSession(): Promise<StoredSession | null> {
  if (Platform.OS === "web") return loadJson<StoredSession>(KEY);
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw === null ? null : (JSON.parse(raw) as StoredSession);
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  if (Platform.OS === "web") return saveJson(KEY, session);
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  } catch {
    // Không lưu được thì phiên chỉ sống tới khi tắt app — vẫn dùng được ngay.
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === "web") return removeKey(KEY);
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Đã đăng xuất trong bộ nhớ rồi; lần mở sau cùng lắm là tự đăng nhập lại.
  }
}

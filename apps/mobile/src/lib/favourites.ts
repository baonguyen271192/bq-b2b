import { useCallback, useEffect, useRef, useState } from "react";
import { loadJson, saveJson, STORE_KEYS } from "./storage";

/**
 * Mẫu đã lưu (nút ♡ trên thẻ sản phẩm), giữ trên MÁY.
 *
 * Trước đây nằm trong `useState` của riêng tab Sản phẩm: bấm tim xong rời tab là
 * mất, và không có chỗ nào xem lại — một nút chết ở mọi thẻ sản phẩm. Giờ lưu
 * `AsyncStorage` và lọc ngay tại tab bằng chip "Đã lưu", không thêm màn mới.
 *
 * TODO(api): chưa có API danh sách yêu thích nên danh sách KHÔNG đồng bộ sang
 * máy khác.
 */
export function useFavourites() {
  const [codes, setCodes] = useState<Set<string>>(() => new Set());
  /** Xem `CartProvider`: chưa đọc xong thì chưa được ghi đè. */
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadJson<string[]>(STORE_KEYS.favourites).then((saved) => {
      if (!alive) return;
      if (saved?.length) setCodes(new Set(saved));
      hydrated.current = true;
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveJson(STORE_KEYS.favourites, [...codes]);
  }, [codes]);

  const toggle = useCallback((code: string) => {
    setCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  return { codes, toggle };
}

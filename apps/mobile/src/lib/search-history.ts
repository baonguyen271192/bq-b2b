import { useCallback, useEffect, useRef, useState } from "react";
import { loadJson, saveJson, STORE_KEYS } from "./storage";

/** Giữ bao nhiêu từ khoá gần nhất. */
const LIMIT = 5;

/**
 * Lịch sử tìm kiếm, lưu trên máy.
 *
 * Đại lý gõ lại cùng một mã mẫu nhiều lần trong ngày; không có lịch sử thì lần
 * nào cũng gõ đủ "GBW0295". Chỉ ghi khi NGƯỜI DÙNG chốt một từ khoá (gửi tìm
 * hoặc mở một kết quả), không ghi theo từng ký tự gõ vào.
 */
export function useSearchHistory() {
  const [recent, setRecent] = useState<string[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadJson<string[]>(STORE_KEYS.searchHistory).then((saved) => {
      if (!alive) return;
      if (saved?.length) setRecent(saved.slice(0, LIMIT));
      hydrated.current = true;
    });
    return () => { alive = false; };
  }, []);

  const remember = useCallback((raw: string) => {
    const term = raw.trim();
    if (!term) return;
    setRecent((prev) => {
      // So khớp không phân biệt hoa thường: "gbw0295" và "GBW0295" là một.
      const next = [term, ...prev.filter((t) => t.toLowerCase() !== term.toLowerCase())]
        .slice(0, LIMIT);
      if (hydrated.current) void saveJson(STORE_KEYS.searchHistory, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    void saveJson(STORE_KEYS.searchHistory, []);
  }, []);

  return { recent, remember, clear };
}

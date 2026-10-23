import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { Product } from "@bq/types";
import { useSession } from "./session";
import { loadJson, removeKey, saveJson, STORE_KEYS } from "./storage";

export interface CartLine {
  code: string;
  name: string;
  image: string;
  unitPrice: number;
  /** size -> số lượng */
  sizes: Record<string, number>;
}

interface CartValue {
  lines: CartLine[];
  totalPairs: number;
  subtotal: number;
  upsert: (product: Product, sizes: Record<string, number>) => void;
  remove: (code: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

/**
 * Giỏ hàng, lưu trên MÁY.
 *
 * Trước đây chỉ nằm trong `useState`: đang chọn size cho một đơn vài trăm đôi,
 * có cuộc gọi xen vào, quay lại thì giỏ trống. Giờ ghi xuống `AsyncStorage` sau
 * mỗi thay đổi và đọc lại lúc mở app.
 *
 * Vẫn là giỏ cục bộ, KHÔNG đồng bộ giữa các máy — việc đó chờ API đơn nháp.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { dealer } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  /**
   * Chưa đọc xong giỏ cũ thì CHƯA được ghi đè lên nó.
   *
   * Thiếu cờ này thì lần render đầu (`lines` rỗng) sẽ ghi một mảng rỗng xuống ổ
   * đĩa trước khi bản đọc kịp trả về — tức là tự xoá giỏ mỗi lần mở app, đúng
   * cái lỗi đang chữa.
   */
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadJson<CartLine[]>(STORE_KEYS.cart).then((saved) => {
      if (!alive) return;
      if (saved?.length) setLines(saved);
      hydrated.current = true;
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveJson(STORE_KEYS.cart, lines);
  }, [lines]);

  // Đăng xuất = xoá giỏ, cả trong bộ nhớ lẫn trên ổ đĩa. Máy dùng chung giữa hai
  // đại lý thì người sau không được thấy giỏ của người trước.
  const signedIn = !!dealer;
  useEffect(() => {
    if (signedIn || !hydrated.current) return;
    setLines([]);
    void removeKey(STORE_KEYS.cart);
  }, [signedIn]);

  const upsert = useCallback((product: Product, sizes: Record<string, number>) => {
    const cleaned = Object.fromEntries(Object.entries(sizes).filter(([, n]) => n > 0));
    setLines((prev) => {
      const rest = prev.filter((l) => l.code !== product.code);
      // Chọn 0 đôi = bỏ mặt hàng khỏi giỏ, không giữ dòng rỗng.
      if (Object.keys(cleaned).length === 0) return rest;
      return [
        ...rest,
        {
          code: product.code,
          name: product.name,
          image: product.image,
          unitPrice: product.price,
          sizes: cleaned,
        },
      ];
    });
  }, []);

  const remove = useCallback(
    (code: string) => setLines((prev) => prev.filter((l) => l.code !== code)),
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const totalPairs = lines.reduce(
      (s, l) => s + Object.values(l.sizes).reduce((a, b) => a + b, 0),
      0,
    );
    const subtotal = lines.reduce(
      (s, l) => s + Object.values(l.sizes).reduce((a, b) => a + b, 0) * l.unitPrice,
      0,
    );
    return { lines, totalPairs, subtotal, upsert, remove, clear };
  }, [lines, upsert, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải nằm trong <CartProvider>");
  return ctx;
}

export const pairsOf = (line: CartLine) =>
  Object.values(line.sizes).reduce((a, b) => a + b, 0);

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@bq/types";

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
 * Giỏ hàng, giữ trong bộ nhớ.
 *
 * Backend chưa có API đơn nháp, nên giỏ mất khi tắt app. Khi có API nháp, thay phần
 * `useState` dưới đây bằng lời gọi mạng — giao diện không phải đổi.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

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

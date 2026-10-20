"use client";
// State phía client: đại lý đang đăng nhập (demo) + giỏ hàng, lưu localStorage.
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface CartLine {
  code: string;
  name: string;
  image: string;
  unit_price: number;
  sizes: Record<string, number>; // {"37": 10}
}

interface Store {
  dealer: string; // mã đại lý demo
  setDealer: (d: string) => void;
  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  removeFromCart: (code: string) => void;
  setSizeQty: (code: string, size: string, qty: number) => void; // sửa SL 1 size
  clearCart: () => void;
  cartCount: number;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dealer, setDealerState] = useState("DL001");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("bq_dealer");
    const c = localStorage.getItem("bq_cart");
    if (d) setDealerState(d);
    if (c) try { setCart(JSON.parse(c)); } catch {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem("bq_dealer", dealer); }, [dealer, ready]);
  useEffect(() => { if (ready) localStorage.setItem("bq_cart", JSON.stringify(cart)); }, [cart, ready]);

  const setDealer = (d: string) => setDealerState(d);

  const addToCart = (line: CartLine) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.code === line.code);
      if (existing) {
        const merged = { ...existing.sizes };
        for (const [s, q] of Object.entries(line.sizes)) merged[s] = (merged[s] || 0) + q;
        return prev.map((l) => (l.code === line.code ? { ...l, sizes: merged } : l));
      }
      return [...prev, line];
    });
  };

  const removeFromCart = (code: string) =>
    setCart((prev) => prev.filter((l) => l.code !== code));

  // Sửa số lượng 1 size: qty<=0 -> bỏ size; hết size -> bỏ luôn dòng.
  const setSizeQty = (code: string, size: string, qty: number) =>
    setCart((prev) => prev.flatMap((l) => {
      if (l.code !== code) return [l];
      const sizes = { ...l.sizes };
      if (qty <= 0) delete sizes[size];
      else sizes[size] = qty;
      return Object.keys(sizes).length ? [{ ...l, sizes }] : [];
    }));

  const clearCart = () => setCart([]);

  // Badge giỏ = số MẪU (sản phẩm khác nhau), không phải tổng số đôi.
  const cartCount = cart.length;

  return (
    <Ctx.Provider value={{ dealer, setDealer, cart, addToCart, removeFromCart, setSizeQty, clearCart, cartCount }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
};

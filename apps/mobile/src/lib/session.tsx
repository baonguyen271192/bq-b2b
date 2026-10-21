import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dealer } from "@bq/types";
import { api } from "./api";

interface SessionValue {
  dealer: Dealer | null;
  loading: boolean;
  error: string | null;
  signIn: (code: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Phiên làm việc của đại lý.
 *
 * Backend CHƯA có xác thực (xem docs/architecture.md §11): demo chốt cứng một mã đại
 * lý. Giữ toàn bộ phần này sau một context để khi có đăng nhập OTP thật, chỉ `signIn`
 * phải đổi — không màn hình nào phải sửa.
 */
const DEMO_DEALER = "DL001";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      setDealer(await api.dealer(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!dealer) return;
    // Công nợ đổi sau mỗi đơn, nên đọc lại thay vì tin số đang giữ trong bộ nhớ.
    try {
      setDealer(await api.dealer(dealer.code));
    } catch {
      // Lỗi mạng khi làm mới KHÔNG được đá người dùng ra ngoài; giữ số cũ.
    }
  }, [dealer]);

  const signOut = useCallback(() => setDealer(null), []);

  const value = useMemo<SessionValue>(
    () => ({ dealer, loading, error, signIn, signOut, refresh }),
    [dealer, loading, error, signIn, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession phải nằm trong <SessionProvider>");
  return ctx;
}

/** Đăng nhập nhanh bằng đại lý demo — dùng ở màn OTP khi chưa có auth thật. */
export function useDemoSignIn() {
  const { signIn } = useSession();
  return useCallback(() => signIn(DEMO_DEALER), [signIn]);
}

/** Tự động tải lại hồ sơ khi màn hình được mở lại. */
export function useRefreshOnMount() {
  const { refresh } = useSession();
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

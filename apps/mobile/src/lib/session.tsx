import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dealer } from "@bq/types";
import { api } from "./api";
import { clearSession, loadSession, saveSession } from "./secure";

interface SessionValue {
  dealer: Dealer | null;
  /** Đang đọc phiên đã lưu lúc mở app — chưa biết là có đăng nhập hay không. */
  restoring: boolean;
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
  const [restoring, setRestoring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      setDealer(await api.dealer(code));
      await saveSession({ dealerCode: code });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Tự đăng nhập lại bằng phiên đã lưu.
   *
   * Trước đây phiên chỉ nằm trong `useState`: đóng app là phải nhập lại OTP,
   * mỗi ngày vài lần, cho một app đại lý mở hàng chục lần một ngày.
   *
   * Hồ sơ vẫn đọc LẠI từ API chứ không lưu cache: hạn mức và công nợ đổi sau
   * mỗi đơn, hiện số cũ còn tệ hơn bắt đăng nhập. Mã đại lý còn thì giữ phiên —
   * backend lỗi mạng lúc mở app không được đá người dùng ra ngoài.
   */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await loadSession();
      if (!alive) return;
      if (saved) {
        try {
          const row = await api.dealer(saved.dealerCode);
          if (alive) setDealer(row);
        } catch {
          // Giữ phiên, để màn sau tự thử lại khi có mạng.
        }
      }
      if (alive) setRestoring(false);
    })();
    return () => { alive = false; };
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

  const signOut = useCallback(() => {
    setDealer(null);
    void clearSession();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ dealer, restoring, loading, error, signIn, signOut, refresh }),
    [dealer, restoring, loading, error, signIn, signOut, refresh],
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

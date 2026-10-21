export interface HttpConfig {
  /**
   * Gốc cho `/api/*`.
   * - Web: để rỗng → gọi cùng origin, Next rewrites proxy sang backend (chạy được
   *   cả localhost lẫn tunnel ngrok mà không cần sửa IP).
   * - Mobile: BẮT BUỘC đặt URL tuyệt đối — app native không có lớp proxy nào.
   */
  baseUrl: string;
  /** Header bổ sung gắn vào mọi request (vd token xác thực sau này). */
  headers?: Record<string, string>;
  /** Tiêm fetch riêng cho test hoặc runtime không có global fetch. */
  fetchImpl?: typeof fetch;
}

/** Lỗi HTTP có kèm status + body thô, để UI phân biệt 404 với 500. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly path: string,
  ) {
    super(`${status} ${body}`);
    this.name = "ApiError";
  }
}

export type Requester = <T>(path: string, init?: RequestInit) => Promise<T>;

export function createRequester(config: HttpConfig): Requester {
  const doFetch = config.fetchImpl ?? globalThis.fetch;
  if (!doFetch) {
    throw new Error("@bq/api-client: môi trường không có fetch — truyền fetchImpl.");
  }

  return async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await doFetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        // Bỏ qua trang cảnh báo của ngrok khi share tunnel cho đồng nghiệp xem demo.
        "ngrok-skip-browser-warning": "true",
        ...config.headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });

    if (!res.ok) throw new ApiError(res.status, await res.text(), path);
    return res.json() as Promise<T>;
  };
}

/** Helper gọn cho body JSON. */
export const jsonBody = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

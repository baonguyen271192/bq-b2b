// API client + kiểu dữ liệu, gọi tới backend FastAPI (nghiệp vụ sỉ B2B của BQ).
// Mặc định rỗng = gọi API cùng origin (đường dẫn tương đối) → Next rewrites proxy
// sang backend :8100. Nhờ vậy chạy được cả localhost lẫn tunnel (ngrok) mà không
// cần sửa IP. Chỉ đặt NEXT_PUBLIC_API_BASE khi muốn trỏ backend ở host khác.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export interface Dealer {
  code: string;
  name: string;
  tier: string;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  owner?: string;
  phone?: string;
  email?: string;
  invoice_address?: string;
}

export interface Product {
  code: string;
  name: string;
  category: string;
  retail: number;
  wholesale: number;
  price: number; // giá theo đại lý
  sizes: Record<string, number>;
  image: string;
  images?: string[];
}

export interface OrderItem {
  code: string;
  name: string;
  sizes: Record<string, number>;
  unit_price: number;
  qty_total: number;
  line_total: number;
}

export interface Order {
  id: string;
  dealer_code: string;
  dealer_name: string;
  items: OrderItem[];
  subtotal: number;
  delivery: string;
  payment: string;
  status: string;
  channel: string;
  over_limit: boolean;
  created_at: string;
  approver?: string;
  approve_note?: string;
}

export interface Analytics {
  gmv_total: number;
  orders_total: number;
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  top_products: { name: string; pairs: number }[];
  low_stock: { code: string; name: string; size: string; stock: number }[];
  total_outstanding: number;
  aging: { code: string; name: string; outstanding: number }[];
  aging_buckets: { label: string; amount: number; count: number }[];
}

export interface SaleOrderCard {
  id: string;
  who: string;
  channel: string;
  product: string;
  pairs: number;
  amount: string;        // đã format sẵn (vd "646.200₫")
  status: string;
  over_limit: boolean;
  created_at: string;
}

// ---- Đơn LẺ (khách qua bot Facebook) — dữ liệu từ service Commerce (đọc/thao tác qua
// proxy /commerce-api, xem next.config.ts). Không giữ DB riêng ở BQ. ----
export interface RetailOrderItem {
  code: string;
  name: string;
  sizes: Record<string, number>;
  unit_price: number;
  qty_total: number;
  line_total: number;
}
export interface RetailOrder {
  id: string;
  store_id: string;
  items: RetailOrderItem[];
  subtotal: number;
  payment: string;
  status: string;
  channel: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  flagged?: number | boolean;
  flag_note?: string | null;
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true", // bỏ qua trang cảnh báo ngrok khi share tunnel
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export interface Payment {
  id: string;
  dealer_code: string;
  order_id: string;
  amount: number;
  method: string;
  created_at: string;
}
export interface CreditDetail {
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  invoices: (Order & { paid?: boolean })[];
  transactions: Payment[];
}

export const api = {
  dealers: () => j<Dealer[]>("/api/dealers"),
  dealer: (code: string) => j<Dealer>(`/api/dealers/${code}`),
  credit: (code: string) => j<CreditDetail>(`/api/dealers/${code}/credit`),
  categories: () => j<string[]>("/api/categories"),
  products: (dealer: string, category?: string) =>
    j<Product[]>(
      `/api/products?dealer=${dealer}${category ? `&category=${encodeURIComponent(category)}` : ""}`
    ),
  orders: (dealer?: string) =>
    j<Order[]>(`/api/orders${dealer ? `?dealer=${dealer}` : ""}`),
  order: (id: string) => j<Order>(`/api/orders/${id}`),
  createOrder: (body: {
    dealer_code: string;
    lines: { code: string; sizes: Record<string, number> }[];
    delivery?: string;
    payment?: string;
    channel?: string;
  }) => j<Order>("/api/orders", { method: "POST", body: JSON.stringify(body) }),
  approve: (id: string, approve: boolean, note = "") =>
    j<Order>(`/api/orders/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approve, note, approver: "Quản lý bán hàng" }),
    }),
  advance: (id: string) =>
    j<Order>(`/api/orders/${id}/advance`, { method: "POST", body: JSON.stringify({}) }),
  cancel: (id: string) =>
    j<Order>(`/api/orders/${id}/cancel`, { method: "POST", body: JSON.stringify({}) }),
  assistant: (dealer_code: string, question: string) =>
    j<{ answer: string; chips?: string[]; engine?: string;
        cards?: { code: string; name: string; image: string; price: number; sizes: Record<string, number> }[] }>("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ dealer_code, question }),
    }),
  saleAssistant: (question: string) =>
    j<{ answer: string; chips?: string[]; engine?: string; orders?: SaleOrderCard[] }>("/api/assistant/sale", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  // ---- Admin ----
  analytics: () => j<Analytics>("/api/admin/analytics"),
  adminProducts: () => j<Product[]>("/api/admin/products"),
  createProduct: (body: Partial<Product>) =>
    j<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (code: string, body: Partial<Product>) =>
    j<Product>(`/api/admin/products/${code}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (code: string) =>
    j<{ ok: boolean }>(`/api/admin/products/${code}`, { method: "DELETE" }),
  updateDealer: (
    code: string,
    body: Partial<Pick<Dealer, "tier" | "credit_limit" | "owner" | "phone" | "email" | "invoice_address">>
  ) => j<Dealer>(`/api/admin/dealers/${code}`, { method: "PUT", body: JSON.stringify(body) }),
  createDealer: (body: Record<string, unknown>) =>
    j<Dealer>("/api/admin/dealers", { method: "POST", body: JSON.stringify(body) }),
  payOrder: (id: string, method = "Chuyển khoản") =>
    j<{ ok: boolean; order_id: string; amount: number }>(`/api/orders/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ method }),
    }),

  // ---- Đơn LẺ (qua bot Facebook) — đọc/thao tác thẳng sang service Commerce ----
  retailOrders: (storeId = "default") =>
    j<RetailOrder[]>(`/commerce-api/orders?store_id=${storeId}`),
  retailProductImages: (storeId = "default") =>
    j<Record<string, string>>(`/commerce-api/product-images?store_id=${storeId}`),
  retailAdvance: (id: string) =>
    j<RetailOrder>(`/commerce-api/orders/${id}/advance`, { method: "POST", body: JSON.stringify({}) }),
  retailCancel: (id: string) =>
    j<RetailOrder>(`/commerce-api/orders/${id}/cancel`, { method: "POST", body: JSON.stringify({}) }),
};

// Nhãn nút "bước tiếp theo" cho đơn LẺ (vòng đời đơn giản hơn — không có bước duyệt).
export const retailNextActionLabel = (status: string): string | null => {
  const lifecycle: Record<string, string> = {
    "Chờ xác nhận": "Xác nhận",
    "Đang đóng gói": "Giao hàng",
    "Đang giao": "Hoàn tất",
  };
  return lifecycle[status] || null;
};

// Nhãn nút "bước tiếp theo" theo trạng thái hiện tại (vòng đời đơn sỉ).
// Bước cuối ("Đại lý đã nhận") giờ đại lý TỰ xác nhận được trong app của họ — nút này ở
// admin chỉ để BQ xử lý HỘ khi đại lý báo qua điện thoại/Zalo thay vì tự bấm.
export const nextActionLabel = (status: string): string | null => {
  const lifecycle: Record<string, string> = {
    "Chờ xác nhận": "Xác nhận",
    "Đã xác nhận": "Đóng gói",
    "Đang đóng gói": "Bàn giao",
    "Đang bàn giao vận chuyển": "Xác nhận hộ đại lý",
  };
  return lifecycle[status] || null;
};

export const vnd = (n: number) =>
  n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";

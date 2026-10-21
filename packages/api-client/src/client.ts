import type {
  Analytics,
  AssistantReply,
  CreateOrderInput,
  CreditDetail,
  Dealer,
  DealerPatch,
  Order,
  Product,
  RetailOrder,
  SaleAssistantReply,
} from "@bq/types";
import { createRequester, type HttpConfig, type Requester } from "./http";

export interface BqApiClient {
  // --- Đại lý & công nợ ---
  dealers(): Promise<Dealer[]>;
  dealer(code: string): Promise<Dealer>;
  credit(code: string): Promise<CreditDetail>;
  // --- Danh mục ---
  categories(): Promise<string[]>;
  products(dealer: string, category?: string): Promise<Product[]>;
  // --- Đơn sỉ ---
  orders(dealer?: string): Promise<Order[]>;
  order(id: string): Promise<Order>;
  createOrder(body: CreateOrderInput): Promise<Order>;
  approve(id: string, approve: boolean, note?: string, approver?: string): Promise<Order>;
  advance(id: string): Promise<Order>;
  cancel(id: string): Promise<Order>;
  payOrder(id: string, method?: string): Promise<{ ok: boolean; order_id: string; amount: number }>;
  // --- Trợ lý AI ---
  assistant(dealerCode: string, question: string): Promise<AssistantReply>;
  saleAssistant(question: string): Promise<SaleAssistantReply>;
  // --- Admin ---
  analytics(): Promise<Analytics>;
  adminProducts(): Promise<Product[]>;
  createProduct(body: Partial<Product>): Promise<Product>;
  updateProduct(code: string, body: Partial<Product>): Promise<Product>;
  deleteProduct(code: string): Promise<{ ok: boolean }>;
  createDealer(body: Record<string, unknown>): Promise<Dealer>;
  updateDealer(code: string, body: DealerPatch): Promise<Dealer>;
  // --- Đơn lẻ (service Commerce) ---
  retailOrders(): Promise<RetailOrder[]>;
  retailAdvance(id: string): Promise<RetailOrder>;
  retailCancel(id: string): Promise<RetailOrder>;
  /** Thoát hiểm: gọi endpoint chưa được bọc trong client. */
  raw: Requester;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export function createApiClient(config: HttpConfig): BqApiClient {
  const j = createRequester(config);

  return {
    dealers: () => j<Dealer[]>("/api/dealers"),
    dealer: (code) => j<Dealer>(`/api/dealers/${code}`),
    credit: (code) => j<CreditDetail>(`/api/dealers/${code}/credit`),

    categories: () => j<string[]>("/api/categories"),
    products: (dealer, category) =>
      j<Product[]>(
        `/api/products?dealer=${dealer}` +
          (category ? `&category=${encodeURIComponent(category)}` : ""),
      ),

    orders: (dealer) => j<Order[]>(`/api/orders${dealer ? `?dealer=${dealer}` : ""}`),
    order: (id) => j<Order>(`/api/orders/${id}`),
    createOrder: (body) => j<Order>("/api/orders", post(body)),
    approve: (id, approve, note = "", approver = "Quản lý bán hàng") =>
      j<Order>(`/api/orders/${id}/approve`, post({ approve, note, approver })),
    advance: (id) => j<Order>(`/api/orders/${id}/advance`, post({})),
    cancel: (id) => j<Order>(`/api/orders/${id}/cancel`, post({})),
    payOrder: (id, method = "Chuyển khoản") =>
      j<{ ok: boolean; order_id: string; amount: number }>(
        `/api/orders/${id}/pay`,
        post({ method }),
      ),

    assistant: (dealer_code, question) =>
      j<AssistantReply>("/api/assistant", post({ dealer_code, question })),
    saleAssistant: (question) =>
      j<SaleAssistantReply>("/api/assistant/sale", post({ question })),

    analytics: () => j<Analytics>("/api/admin/analytics"),
    adminProducts: () => j<Product[]>("/api/admin/products"),
    createProduct: (body) => j<Product>("/api/admin/products", post(body)),
    updateProduct: (code, body) =>
      j<Product>(`/api/admin/products/${code}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteProduct: (code) => j<{ ok: boolean }>(`/api/admin/products/${code}`, { method: "DELETE" }),
    createDealer: (body) => j<Dealer>("/api/admin/dealers", post(body)),
    updateDealer: (code, body) =>
      j<Dealer>(`/api/admin/dealers/${code}`, { method: "PUT", body: JSON.stringify(body) }),

    retailOrders: () => j<RetailOrder[]>("/api/retail/orders"),
    retailAdvance: (id) => j<RetailOrder>(`/api/retail/orders/${id}/advance`, post({})),
    retailCancel: (id) => j<RetailOrder>(`/api/retail/orders/${id}/cancel`, post({})),

    raw: j,
  };
}

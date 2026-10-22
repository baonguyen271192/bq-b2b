import type { Order } from "@bq/types";

/** Một dòng trên hoá đơn VAT — số liệu do hệ thống hoá đơn điện tử trả về. */
export interface InvoiceLine {
  description: string;
  quantity: number;
  /** Đơn giá CHƯA thuế. */
  unitPrice: number;
  /** Thành tiền chưa thuế. */
  lineTotal: number;
}

export interface VatInvoice {
  /** Ký hiệu hoá đơn, vd "1C26TBQ". */
  serial: string;
  /** Số hoá đơn, vd "0001582". */
  number: string;
  issuedAt: string;
  sellerName: string;
  buyerName: string;
  buyerTaxCode: string;
  buyerAddress: string;
  paymentTerm: string;
  lines: InvoiceLine[];
  /** Cộng tiền hàng chưa thuế. */
  subtotal: number;
  /** Thuế suất phần trăm, vd 8 hoặc 10. */
  taxRate: number;
  taxAmount: number;
  total: number;
  lookupCode: string;
  signed: boolean;
}

/**
 * Hoá đơn VAT (SPEC §3.22).
 *
 * ⚠️ CHƯA CÓ DỮ LIỆU. Quyết định C ghi rõ: thuế suất, đơn giá chưa thuế, thành
 * tiền và tiền thuế phải là SỐ DO BACKEND / hệ thống hoá đơn điện tử trả về,
 * app KHÔNG tự tính và không hardcode 8%.
 *
 * Backend hiện chỉ có `Order` (tổng đã gồm thuế, không tách thuế), và không có
 * endpoint hoá đơn nào. Nên `find()` trả `null` — màn hiện trạng thái "chưa sẵn
 * sàng" thay vì dựng một chứng từ kế toán bằng số tự nghĩ ra.
 *
 * TODO(api): `GET /api/orders/{id}/invoice`.
 */
export interface InvoiceRepository {
  find(orderId: string): Promise<VatInvoice | null>;
  /** Đơn nào đã có hoá đơn. Hiện luôn rỗng. */
  listFor(orders: Order[]): Promise<{ order: Order; invoice: VatInvoice | null }[]>;
}

export const invoiceRepository: InvoiceRepository = {
  async find() { return null; },
  async listFor(orders) { return orders.map((order) => ({ order, invoice: null })); },
};

import type { SaleOrderCard } from "./analytics";

export interface AssistantProductCard {
  code: string;
  name: string;
  image: string;
  price: number;
  sizes: Record<string, number>;
}

/**
 * Đơn nháp do trợ lý dựng (`action.type === "create_order"`).
 *
 * Backend ĐÃ trả trường này (`apps/api/app/assistant.py`, nhánh `_is_create_intent`);
 * thiếu ở đây là lỗi của type, không phải của API.
 */
export interface AssistantDraftLine {
  code: string;
  name: string;
  image?: string | null;
  unit_price: number;
  /** size -> số đôi */
  sizes: Record<string, number>;
}

export interface AssistantCreateOrderAction {
  type: "create_order";
  lines: AssistantDraftLine[];
  subtotal: number;
  total_pairs: number;
}

/** Trợ lý AI cho ĐẠI LÝ. */
export interface AssistantReply {
  answer: string;
  chips?: string[];
  engine?: string;
  cards?: AssistantProductCard[];
  /** Hành động kèm theo câu trả lời. Hiện chỉ có dựng đơn nháp. */
  action?: AssistantCreateOrderAction;
}

/** Trợ lý AI cho SALE/quản lý. */
export interface SaleAssistantReply {
  answer: string;
  chips?: string[];
  engine?: string;
  orders?: SaleOrderCard[];
}

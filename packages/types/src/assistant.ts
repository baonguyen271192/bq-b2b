import type { SaleOrderCard } from "./analytics";

export interface AssistantProductCard {
  code: string;
  name: string;
  image: string;
  price: number;
  sizes: Record<string, number>;
}

/** Trợ lý AI cho ĐẠI LÝ. */
export interface AssistantReply {
  answer: string;
  chips?: string[];
  engine?: string;
  cards?: AssistantProductCard[];
}

/** Trợ lý AI cho SALE/quản lý. */
export interface SaleAssistantReply {
  answer: string;
  chips?: string[];
  engine?: string;
  orders?: SaleOrderCard[];
}

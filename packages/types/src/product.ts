/** Sản phẩm + tồn theo size. `price` là giá đã áp bậc của đại lý đang xem. */
export interface Product {
  code: string;
  name: string;
  category: string;
  retail: number;
  wholesale: number;
  price: number;
  /** size -> tồn kho (đôi) */
  sizes: Record<string, number>;
  image: string;
  images?: string[];
}

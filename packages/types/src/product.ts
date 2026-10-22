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
  /**
   * Tên màu của mẫu, vd `["Đen", "Nâu"]`. Rỗng nghĩa là mẫu chỉ có một màu
   * không đặt tên.
   *
   * Backend ĐÃ trả trường này (`Product.java`, `demo/products.json`: 115/258 mẫu
   * có màu) — thiếu ở đây là lỗi của type, không phải của API.
   *
   * CẢNH BÁO: màu CHƯA đi được vào đơn. `OrderItem` và `CartLine` chỉ có
   * `code` + `sizes`, nên lựa chọn màu hiện chỉ sống trong màn hình. Xem mục
   * "việc cho backend" ở báo cáo Phase 3 trước khi coi tính năng này là xong.
   */
  colors?: string[];
}

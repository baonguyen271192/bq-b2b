package vn.com.giaybq.api.domain;

import java.util.List;
import java.util.Map;

/**
 * Sản phẩm + tồn theo size.
 *
 * @param price giá đã áp bậc của đại lý đang xem; 0 khi chưa gắn đại lý nào.
 * @param sizes size -> tồn kho (đôi). Đây là "bảng size" — khái niệm SAP B1 KHÔNG có
 *              sẵn, xem {@code adapters/sapb1/SapB1Mapping}.
 */
public record Product(
    String code,
    String name,
    String category,
    long retail,
    long wholesale,
    long price,
    Map<String, Integer> sizes,
    String image,
    List<String> images,
    List<String> colors
) {
  public Product withPrice(long dealerPrice) {
    return new Product(code, name, category, retail, wholesale, dealerPrice,
        sizes, image, images, colors);
  }
}

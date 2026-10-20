package vn.com.giaybq.api.ports;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Product;

/**
 * Hợp đồng danh mục: sản phẩm, nhóm hàng, tồn theo size, giá theo đại lý.
 *
 * <p>Controller và service CHỈ được phụ thuộc vào interface này, không bao giờ phụ
 * thuộc một hiện thực cụ thể. Đổi nguồn dữ liệu demo -> SAP Business One là đổi
 * {@code bq.data-source} trong cấu hình, không sửa nghiệp vụ.
 */
public interface CatalogPort {

  List<String> categories();

  /** Sản phẩm (chưa áp giá đại lý). {@code category} null = tất cả. */
  List<Product> products(String category);

  Optional<Product> product(String code);

  /**
   * Giá sỉ cuối cùng cho một đại lý.
   *
   * <p>Demo: giá sỉ cơ bản trừ chiết khấu theo bậc. SAP B1: lấy từ bảng giá gán cho
   * BusinessPartner, có thể bị SpecialPrices ghi đè — nên phép tính PHẢI nằm trong
   * adapter, không nằm trong controller.
   */
  long dealerPrice(Product product, Dealer dealer);

  // --- CRUD quản trị ---
  // Chỉ có nghĩa khi BQ làm chủ danh mục. Khi nguồn là ERP, adapter phải ném
  // ErpOwnedException thay vì ghi ngược — ERP là nguồn sự thật.

  Product add(Product product);

  Optional<Product> update(String code, Product patch);

  boolean remove(String code);

  Optional<Product> setStock(String code, Map<String, Integer> sizes);
}

package vn.com.giaybq.api.adapters.demo;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Product;

/**
 * Dữ liệu mẫu nạp một lần lúc khởi động từ {@code resources/demo/*.json}.
 *
 * <p>JSON này sinh từ {@code apps/api/app/catalog.py} + {@code data.py} của bản Python,
 * nên hai backend chạy trên CÙNG dữ liệu — điều kiện bắt buộc để so sánh kết quả khi
 * đối chiếu parity.
 *
 * <p>Giữ trong bộ nhớ, có thể sửa (giống bản Python): CRUD của admin chỉ hiệu lực tới
 * khi restart. Chấp nhận được vì đây là nguồn DEMO; nguồn thật là SAP B1.
 */
@Component
public class DemoData {

  private final Map<String, Product> products = new LinkedHashMap<>();
  private final Map<String, Dealer> dealers = new LinkedHashMap<>();
  private final List<String> categories;
  private final Map<String, Double> tierDiscounts;

  DemoData(ObjectMapper mapper) {
    // ObjectMapper của Spring đang ở chế độ SNAKE_CASE, khớp đúng khoá trong JSON.
    for (var p : read(mapper, "demo/products.json", new TypeReference<List<Product>>() {})) {
      products.put(p.code(), p);
    }
    for (var d : read(mapper, "demo/dealers.json", new TypeReference<List<Dealer>>() {})) {
      dealers.put(d.code(), d);
    }
    categories = read(mapper, "demo/categories.json", new TypeReference<List<String>>() {});
    tierDiscounts =
        read(mapper, "demo/tier-discounts.json", new TypeReference<Map<String, Double>>() {});
  }

  private static <T> T read(ObjectMapper mapper, String path, TypeReference<T> type) {
    try (InputStream in = new ClassPathResource(path).getInputStream()) {
      return mapper.readValue(in, type);
    } catch (IOException e) {
      throw new IllegalStateException("Không đọc được dữ liệu demo: " + path, e);
    }
  }

  Map<String, Product> products() {
    return products;
  }

  Map<String, Dealer> dealers() {
    return dealers;
  }

  List<String> categories() {
    return categories;
  }

  double tierDiscount(String tier) {
    return tierDiscounts.getOrDefault(tier, 0.0);
  }
}

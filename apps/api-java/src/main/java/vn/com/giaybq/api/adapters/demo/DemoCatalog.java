package vn.com.giaybq.api.adapters.demo;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Product;
import vn.com.giaybq.api.ports.CatalogPort;

/** Danh mục từ dữ liệu mẫu trong repo. */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "demo", matchIfMissing = true)
class DemoCatalog implements CatalogPort {

  private final DemoData data;

  DemoCatalog(DemoData data) {
    this.data = data;
  }

  @Override
  public List<String> categories() {
    return data.categories();
  }

  @Override
  public List<Product> products(String category) {
    var all = data.products().values().stream();
    if (category != null && !category.isBlank()) {
      all = all.filter(p -> category.equals(p.category()));
    }
    return all.toList();
  }

  @Override
  public Optional<Product> product(String code) {
    return Optional.ofNullable(data.products().get(code.toUpperCase()));
  }

  @Override
  public long dealerPrice(Product product, Dealer dealer) {
    // Giá sỉ cơ bản trừ chiết khấu theo bậc. Math.round khớp hành vi round() của
    // bản Python — lệch 1 đồng ở đây là lệch tiền trên hoá đơn.
    double discount = data.tierDiscount(dealer.tier());
    return Math.round(product.wholesale() * (1 - discount));
  }

  @Override
  public Product add(Product product) {
    data.products().put(product.code(), product);
    return product;
  }

  @Override
  public Optional<Product> update(String code, Product patch) {
    var existing = data.products().get(code.toUpperCase());
    if (existing == null) {
      return Optional.empty();
    }
    var merged = new Product(
        existing.code(),
        patch.name() != null ? patch.name() : existing.name(),
        patch.category() != null ? patch.category() : existing.category(),
        patch.retail() != 0 ? patch.retail() : existing.retail(),
        patch.wholesale() != 0 ? patch.wholesale() : existing.wholesale(),
        existing.price(),
        patch.sizes() != null ? patch.sizes() : existing.sizes(),
        patch.images() != null && !patch.images().isEmpty()
            ? patch.images().get(0) : existing.image(),
        patch.images() != null && !patch.images().isEmpty()
            ? patch.images() : existing.images(),
        existing.colors()
    );
    data.products().put(existing.code(), merged);
    return Optional.of(merged);
  }

  @Override
  public boolean remove(String code) {
    return data.products().remove(code.toUpperCase()) != null;
  }

  @Override
  public Optional<Product> setStock(String code, Map<String, Integer> sizes) {
    return product(code).map(p -> {
      var updated = new Product(p.code(), p.name(), p.category(), p.retail(), p.wholesale(),
          p.price(), sizes, p.image(), p.images(), p.colors());
      data.products().put(p.code(), updated);
      return updated;
    });
  }
}

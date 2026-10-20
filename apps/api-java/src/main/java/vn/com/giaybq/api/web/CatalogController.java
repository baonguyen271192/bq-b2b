package vn.com.giaybq.api.web;

import java.util.List;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.com.giaybq.api.domain.Product;
import vn.com.giaybq.api.ports.CatalogPort;
import vn.com.giaybq.api.ports.DealerPort;

/** Danh mục sản phẩm và nhóm hàng. */
@RestController
class CatalogController {

  private final CatalogPort catalog;
  private final DealerPort dealers;

  CatalogController(CatalogPort catalog, DealerPort dealers) {
    this.catalog = catalog;
    this.dealers = dealers;
  }

  /**
   * Sản phẩm kèm giá sỉ theo đại lý khi truyền {@code ?dealer=DL001}.
   * Không truyền đại lý thì {@code price} = giá sỉ cơ bản.
   */
  @GetMapping("/api/products")
  List<Product> products(@RequestParam(required = false) @Nullable String dealer,
                         @RequestParam(required = false) @Nullable String category) {
    var found = dealer == null || dealer.isBlank()
        ? java.util.Optional.<vn.com.giaybq.api.domain.Dealer>empty()
        : dealers.get(dealer);

    return catalog.products(category).stream()
        .map(p -> p.withPrice(found.map(d -> catalog.dealerPrice(p, d)).orElse(p.wholesale())))
        .toList();
  }

  @GetMapping("/api/categories")
  List<String> categories() {
    return catalog.categories();
  }
}

package vn.com.giaybq.api.web;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.com.giaybq.api.domain.Analytics;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.DealerView;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.domain.Product;
import vn.com.giaybq.api.ports.CatalogPort;
import vn.com.giaybq.api.ports.DealerPort;
import vn.com.giaybq.api.ports.OrderPort;
import vn.com.giaybq.api.service.OrderService;
import vn.com.giaybq.api.web.dto.Requests;

/**
 * Admin một vai trò.
 *
 * <p>Nguồn 'demo': sản phẩm & đại lý giữ trong bộ nhớ → CRUD hiệu lực tới khi restart;
 * đơn/thanh toán bền trong SQLite. Nguồn 'sapb1': danh mục và hạn mức do ERP làm chủ →
 * adapter ném ErpOwnedException và {@code ApiExceptionHandler} dịch thành HTTP 409.
 */
@RestController
@RequestMapping("/api/admin")
class AdminController {

  private final CatalogPort catalog;
  private final DealerPort dealers;
  private final OrderPort orders;

  AdminController(CatalogPort catalog, DealerPort dealers, OrderPort orders) {
    this.catalog = catalog;
    this.dealers = dealers;
    this.orders = orders;
  }

  // ---------- Thống kê ----------

  @GetMapping("/analytics")
  Analytics analytics() {
    var all = orders.list(null);
    var active = all.stream().filter(AdminController::isActive).toList();

    var byStatus = new LinkedHashMap<String, Integer>();
    var byChannel = new LinkedHashMap<String, Integer>();
    var pairsByProduct = new LinkedHashMap<String, Integer>();
    for (var o : all) {
      byStatus.merge(o.status(), 1, Integer::sum);
      byChannel.merge(o.channel(), 1, Integer::sum);
    }
    for (var o : active) {
      for (var item : o.items()) {
        pairsByProduct.merge(item.name(), item.qtyTotal(), Integer::sum);
      }
    }

    var topProducts = pairsByProduct.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(5)
        .map(e -> new Analytics.TopProduct(e.getKey(), e.getValue()))
        .toList();

    var lowStock = new ArrayList<Analytics.LowStock>();
    for (var p : catalog.products(null)) {
      p.sizes().forEach((size, stock) -> {
        if (stock <= 5) {
          lowStock.add(new Analytics.LowStock(p.code(), p.name(), size, stock));
        }
      });
    }

    var aging = new ArrayList<Analytics.Aging>();
    for (var d : dealers.all()) {
      long outstanding = orders.outstandingCredit(d.code());
      if (outstanding > 0) {
        aging.add(new Analytics.Aging(d.code(), d.name(), outstanding));
      }
    }

    return new Analytics(
        active.stream().mapToLong(Order::subtotal).sum(),
        all.size(),
        byStatus,
        byChannel,
        topProducts,
        lowStock,
        aging.stream().mapToLong(Analytics.Aging::outstanding).sum(),
        aging.stream().sorted(Comparator.comparingLong(Analytics.Aging::outstanding).reversed())
            .toList(),
        agingBuckets());
  }

  /** Tuổi nợ THẬT: nhóm hoá đơn công nợ chưa trả theo số ngày kể từ ngày đặt. */
  private List<Analytics.AgingBucket> agingBuckets() {
    record Bucket(String label, int min, int max) {}
    var defs = List.of(
        new Bucket("0–30 ngày", 0, 30),
        new Bucket("31–60 ngày", 31, 60),
        new Bucket("61–90 ngày", 61, 90),
        new Bucket("Trên 90 ngày", 91, Integer.MAX_VALUE));

    var amounts = new long[defs.size()];
    var counts = new int[defs.size()];
    var today = LocalDate.now();

    for (var d : dealers.all()) {
      for (var invoice : orders.creditOrders(d.code())) {
        if (Boolean.TRUE.equals(invoice.paid())) {
          continue;
        }
        long days = daysSince(invoice.createdAt(), today);
        for (int i = 0; i < defs.size(); i++) {
          if (days >= defs.get(i).min() && days <= defs.get(i).max()) {
            amounts[i] += invoice.subtotal();
            counts[i]++;
            break;
          }
        }
      }
    }

    var out = new ArrayList<Analytics.AgingBucket>(defs.size());
    for (int i = 0; i < defs.size(); i++) {
      out.add(new Analytics.AgingBucket(defs.get(i).label(), amounts[i], counts[i]));
    }
    return out;
  }

  /** Ngày đặt lưu dạng "dd/MM/yyyy HH:mm". Không parse được thì coi như hôm nay (0 ngày). */
  private static long daysSince(String createdAt, LocalDate today) {
    try {
      var created = LocalDateTime.parse(createdAt, OrderService.TIMESTAMP).toLocalDate();
      return Math.max(0, ChronoUnit.DAYS.between(created, today));
    } catch (DateTimeParseException | NullPointerException e) {
      return 0;
    }
  }

  private static boolean isActive(Order o) {
    String s = o.status() == null ? "" : o.status().toLowerCase(Locale.ROOT);
    return !s.contains("huỷ") && !s.contains("hủy") && !s.contains("từ chối");
  }

  // ---------- Sản phẩm ----------

  /**
   * Danh mục cho admin.
   *
   * <p>Khác CÓ CHỦ Ý so với bản Python: bản Python không trả trường {@code price} ở
   * endpoint này, trong khi type {@code Product} của frontend khai {@code price} là bắt
   * buộc — tức bản Python vi phạm hợp đồng của chính nó. Admin không xem theo một đại
   * lý cụ thể nên {@code price} = giá sỉ cơ bản, giống {@code /api/products} khi không
   * truyền {@code ?dealer=}. Giao diện admin chỉ đọc retail/wholesale nên không ảnh hưởng.
   */
  @GetMapping("/products")
  List<Product> products() {
    return catalog.products(null).stream().map(p -> p.withPrice(p.wholesale())).toList();
  }

  @PostMapping("/products")
  Product createProduct(@Valid @RequestBody Requests.ProductBody body) {
    String code = body.code().toUpperCase();
    if (catalog.product(code).isPresent()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã sản phẩm đã tồn tại");
    }
    var images = body.images() == null ? List.<String>of() : body.images();
    return catalog.add(new Product(code, body.name(), body.category(), body.retail(),
        body.wholesale(), 0, body.sizes(), images.isEmpty() ? "" : images.get(0), images,
        List.of()));
  }

  @PutMapping("/products/{code}")
  Product updateProduct(@PathVariable String code, @RequestBody Requests.ProductBody body) {
    var patch = new Product(code, body.name(), body.category(), body.retail(), body.wholesale(),
        0, body.sizes(), null, body.images(), null);
    return catalog.update(code, patch)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "Sản phẩm không tồn tại"));
  }

  @DeleteMapping("/products/{code}")
  Map<String, Boolean> deleteProduct(@PathVariable String code) {
    if (!catalog.remove(code)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm không tồn tại");
    }
    return Map.of("ok", true);
  }

  // ---------- Đại lý ----------

  @PutMapping("/dealers/{code}")
  DealerView updateDealer(@PathVariable String code,
                          @RequestBody Requests.DealerUpdateBody body) {
    if (dealers.get(code).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Đại lý không tồn tại");
    }
    var patch = new Dealer(code, null, body.tier(),
        body.creditLimit() == null ? 0 : body.creditLimit(), 0,
        body.owner(), body.phone(), body.email(), body.invoiceAddress());
    var updated = dealers.update(code, patch).orElseThrow();
    return DealerView.of(updated, dealers.creditUsed(updated));
  }

  @PostMapping("/dealers")
  DealerView createDealer(@RequestBody Map<String, Object> body) {
    String code = String.valueOf(body.getOrDefault("code", "")).toUpperCase();
    if (code.isBlank() || dealers.get(code).isPresent()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Mã đại lý trống hoặc đã tồn tại");
    }
    var dealer = new Dealer(
        code,
        String.valueOf(body.getOrDefault("name", code)),
        String.valueOf(body.getOrDefault("tier", "Đồng")),
        asLong(body.get("credit_limit")),
        0,
        String.valueOf(body.getOrDefault("owner", "")),
        String.valueOf(body.getOrDefault("phone", "")),
        String.valueOf(body.getOrDefault("email", "")),
        String.valueOf(body.getOrDefault("invoice_address", "")));
    var created = dealers.create(dealer);
    return DealerView.of(created, dealers.creditUsed(created));
  }

  private static long asLong(Object value) {
    return value instanceof Number n ? n.longValue() : 0L;
  }
}

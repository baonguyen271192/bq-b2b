package vn.com.giaybq.api.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.stereotype.Service;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.domain.OrderItem;
import vn.com.giaybq.api.ports.CatalogPort;
import vn.com.giaybq.api.ports.DealerPort;
import vn.com.giaybq.api.ports.OrderPort;
import vn.com.giaybq.api.web.dto.CreateOrderRequest;

/**
 * Nghiệp vụ tạo đơn sỉ: lọc size hợp lệ, tính tiền, kiểm hạn mức công nợ.
 *
 * <p>Service này chỉ biết các port — nó chạy y hệt nhau dù dữ liệu đến từ bộ nhớ hay
 * từ SAP B1. Đó là toàn bộ mục đích của tầng port.
 */
@Service
public class OrderService {

  /** Trùng định dạng của bản Python để lịch sử đơn cũ vẫn đọc/sắp xếp được. */
  public static final DateTimeFormatter TIMESTAMP =
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

  /** Vòng đời đơn sỉ — sale đẩy đơn tiến qua từng bước. */
  public static final List<String> LIFECYCLE = List.of(
      "Chờ xác nhận",
      "Đã xác nhận",
      "Đang đóng gói",
      "Đang bàn giao vận chuyển",
      "Đại lý đã nhận");

  private final CatalogPort catalog;
  private final DealerPort dealers;
  private final OrderPort orders;

  OrderService(CatalogPort catalog, DealerPort dealers, OrderPort orders) {
    this.catalog = catalog;
    this.dealers = dealers;
    this.orders = orders;
  }

  public long creditAvailable(Dealer dealer) {
    return dealer.creditLimit() - dealers.creditUsed(dealer);
  }

  /**
   * Dựng đơn từ yêu cầu của client.
   *
   * @throws UnknownProductException  mã sản phẩm không tồn tại
   * @throws EmptyOrderException      không dòng nào hợp lệ sau khi lọc theo tồn kho
   */
  public Order create(Dealer dealer, CreateOrderRequest request) {
    var items = new ArrayList<OrderItem>();
    long subtotal = 0;

    for (var line : request.lines()) {
      var product = catalog.product(line.code())
          .orElseThrow(() -> new UnknownProductException(line.code()));
      long unitPrice = catalog.dealerPrice(product, dealer);

      // Chỉ nhận size có thật và số lượng không vượt tồn kho. Lọc im lặng thay vì
      // báo lỗi là hành vi của bản Python — giữ nguyên để FE không phải đổi.
      var valid = new LinkedHashMap<String, Integer>();
      line.sizes().forEach((size, qty) -> {
        Integer stock = product.sizes().get(size);
        if (stock != null && qty > 0 && qty <= stock) {
          valid.put(size, qty);
        }
      });
      if (valid.isEmpty()) {
        continue;
      }

      int qtyTotal = valid.values().stream().mapToInt(Integer::intValue).sum();
      long lineTotal = (long) qtyTotal * unitPrice;
      items.add(new OrderItem(product.code(), product.name(), valid, unitPrice, qtyTotal,
          lineTotal));
      subtotal += lineTotal;
    }

    if (items.isEmpty()) {
      throw new EmptyOrderException();
    }

    boolean overLimit = subtotal > creditAvailable(dealer);
    return orders.create(dealer, items, subtotal, request.deliveryOrDefault(),
        request.paymentOrDefault(), overLimit, request.channelOrDefault(),
        LocalDateTime.now().format(TIMESTAMP));
  }

  public static class UnknownProductException extends RuntimeException {
    public UnknownProductException(String code) {
      super("Sản phẩm " + code + " không tồn tại");
    }
  }

  public static class EmptyOrderException extends RuntimeException {
    public EmptyOrderException() {
      super("Đơn không có dòng hợp lệ");
    }
  }
}

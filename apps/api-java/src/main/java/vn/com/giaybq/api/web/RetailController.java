package vn.com.giaybq.api.web;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.domain.RetailOrder;
import vn.com.giaybq.api.domain.RetailOrderItem;
import vn.com.giaybq.api.ports.RetailOrderPort;
import vn.com.giaybq.api.service.RetailLifecycle;
import vn.com.giaybq.api.web.dto.CreateRetailOrderRequest;

/**
 * Đơn LẺ: bot ghi vào, admin BQ xem và đẩy trạng thái.
 *
 * <p>Trước đây dữ liệu này nằm ở một service Commerce đa khách hàng bên ngoài, admin
 * BQ gọi qua proxy {@code /commerce-api}. Cách đó gắn BQ vào một hệ thống của bên khác,
 * cần đăng nhập chéo domain, và mặc định cấu hình có thể trỏ nhầm sang cửa hàng khác.
 * Giờ BQ sở hữu dữ liệu đơn lẻ của chính mình.
 */
@RestController
@RequestMapping("/api/retail")
class RetailController {

  private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

  private final RetailOrderPort orders;
  private final String ingestKey;

  RetailController(RetailOrderPort orders, BqProperties props) {
    this.orders = orders;
    this.ingestKey = props.retail() == null ? "" : nullToEmpty(props.retail().ingestKey());
  }

  // --- Admin đọc -----------------------------------------------------------

  @GetMapping("/orders")
  List<RetailOrder> list() {
    return orders.list();
  }

  @GetMapping("/orders/{id}")
  RetailOrder get(@PathVariable String id) {
    return orders.get(id).orElseThrow(() -> notFound(id));
  }

  // --- Admin đẩy vòng đời --------------------------------------------------

  @PostMapping("/orders/{id}/advance")
  RetailOrder advance(@PathVariable String id) {
    var order = orders.get(id).orElseThrow(() -> notFound(id));
    String next = RetailLifecycle.next(order.status()).orElseThrow(() ->
        new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Không đẩy tiếp được đơn ở trạng thái '" + order.status() + "'"));
    return orders.setStatus(id, next).orElseThrow(() -> notFound(id));
  }

  /**
   * Huỷ đơn.
   *
   * <p>Huỷ đơn ĐÃ thu tiền khác huỷ đơn chưa thu: trường hợp đầu phát sinh nghĩa vụ
   * hoàn tiền, phải ghi lại để kế toán thấy. Gộp hai việc là mất dấu tiền khách.
   */
  @PostMapping("/orders/{id}/cancel")
  RetailOrder cancel(@PathVariable String id) {
    var order = orders.get(id).orElseThrow(() -> notFound(id));
    if (RetailLifecycle.PAID.equals(order.paymentStatus())) {
      orders.markRefundDue(id);
    }
    return orders.setStatus(id, RetailLifecycle.CANCELLED).orElseThrow(() -> notFound(id));
  }

  // --- Bot ghi vào ---------------------------------------------------------

  /**
   * Bot chốt đơn với khách rồi bắn vào đây.
   *
   * <p>Xác thực bằng khoá dùng chung trên header {@code X-BQ-Retail-Key}. FAIL CLOSED:
   * chưa cấu hình khoá thì từ chối, KHÔNG mở sẵn. Endpoint này ghi đơn thật — để hở
   * là bất kỳ ai trên Internet cũng tạo được đơn cho BQ.
   */
  @PostMapping("/orders")
  RetailOrder ingest(@RequestHeader(name = "X-BQ-Retail-Key", required = false)
                     @Nullable String key,
                     @Valid @RequestBody CreateRetailOrderRequest body) {
    requireIngestKey(key);

    long computed = body.computedSubtotal();
    if (body.subtotal() != computed) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Tổng tiền lệch: bot gửi " + body.subtotal() + ", tính lại từ dòng hàng được "
              + computed);
    }

    var items = body.items().stream()
        .map(i -> new RetailOrderItem(i.code(), i.name(), i.sizes(), i.unitPrice(),
            i.qtyTotal(), i.lineTotal()))
        .toList();

    return orders.create(items, computed, body.payment(), body.channel(), body.senderId(),
        body.customerName(), body.customerPhone(), body.customerAddress(), body.flagged(),
        body.flagNote(), LocalDateTime.now().format(TS));
  }

  private void requireIngestKey(@Nullable String provided) {
    if (ingestKey.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Chưa cấu hình BQ_RETAIL_INGEST_KEY — endpoint nhận đơn từ bot đang tắt.");
    }
    if (provided == null || !constantTimeEquals(ingestKey, provided)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Khoá không hợp lệ");
    }
  }

  /** So sánh không phụ thuộc thời gian — đừng để kẻ gọi dò khoá bằng cách đo độ trễ. */
  private static boolean constantTimeEquals(String a, String b) {
    return java.security.MessageDigest.isEqual(
        a.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        b.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  private static String nullToEmpty(@Nullable String s) {
    return s == null ? "" : s;
  }

  private static ResponseStatusException notFound(String id) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Đơn lẻ không tồn tại: " + id);
  }
}

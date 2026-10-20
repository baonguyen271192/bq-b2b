package vn.com.giaybq.api.web;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.ports.DealerPort;
import vn.com.giaybq.api.ports.OrderPort;
import vn.com.giaybq.api.service.OrderService;
import vn.com.giaybq.api.web.dto.CreateOrderRequest;
import vn.com.giaybq.api.web.dto.Requests;

/** Đơn hàng sỉ: tạo, tra cứu, duyệt, đẩy trạng thái, huỷ, thanh toán. */
@RestController
@RequestMapping("/api/orders")
class OrderController {

  private final OrderPort orders;
  private final DealerPort dealers;
  private final OrderService service;

  OrderController(OrderPort orders, DealerPort dealers, OrderService service) {
    this.orders = orders;
    this.dealers = dealers;
    this.service = service;
  }

  @PostMapping
  Order create(@Valid @RequestBody CreateOrderRequest body) {
    var dealer = dealers.get(body.dealerCode())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "Đại lý không tồn tại"));
    return service.create(dealer, body);
  }

  @GetMapping
  List<Order> list(@RequestParam(required = false) @Nullable String dealer) {
    return orders.list(dealer == null ? null : dealer.toUpperCase());
  }

  @GetMapping("/{id}")
  Order get(@PathVariable String id) {
    return require(id);
  }

  /** Sale/quản lý duyệt hoặc từ chối đơn VƯỢT HẠN MỨC đang chờ duyệt. */
  @PostMapping("/{id}/approve")
  Order approve(@PathVariable String id, @RequestBody Requests.ApproveBody body) {
    require(id);
    String status = body.approve() ? "Đã xác nhận" : "Đã từ chối";
    String note = body.note() != null && !body.note().isBlank()
        ? body.note()
        : (body.approve() ? "Đã duyệt ngoại lệ" : "Từ chối");
    return orders.setStatus(id, status, body.approverOrDefault(), note).orElseThrow();
  }

  /** Đẩy đơn sang trạng thái kế tiếp trong vòng đời. */
  @PostMapping("/{id}/advance")
  Order advance(@PathVariable String id, @RequestBody Requests.ActorBody body) {
    var order = require(id);
    int index = OrderService.LIFECYCLE.indexOf(order.status());
    if (index < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Không thể đẩy đơn ở trạng thái '" + order.status() + "'");
    }
    if (index >= OrderService.LIFECYCLE.size() - 1) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đã ở trạng thái cuối");
    }
    return orders.setStatus(id, OrderService.LIFECYCLE.get(index + 1), body.actorOrDefault(),
        "Cập nhật bởi " + body.actorOrDefault()).orElseThrow();
  }

  @PostMapping("/{id}/cancel")
  Order cancel(@PathVariable String id, @RequestBody Requests.ActorBody body) {
    require(id);
    return orders.setStatus(id, "Đã huỷ", body.actorOrDefault(), "Đã huỷ đơn").orElseThrow();
  }

  /** Ghi nhận thanh toán cho một đơn công nợ (trừ vào công nợ thật). */
  @PostMapping("/{id}/pay")
  Map<String, Object> pay(@PathVariable String id, @RequestBody Requests.PayBody body) {
    var order = require(id);
    orders.addPayment(order.dealerCode(), id, order.subtotal(), body.methodOrDefault(),
        LocalDateTime.now().format(OrderService.TIMESTAMP));
    return Map.of("ok", true, "order_id", id, "amount", order.subtotal());
  }

  private Order require(String id) {
    return orders.get(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "Đơn không tồn tại"));
  }
}

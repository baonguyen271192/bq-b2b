package vn.com.giaybq.api.ports;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.domain.OrderItem;
import vn.com.giaybq.api.domain.Payment;

/** Hợp đồng đơn hàng sỉ + thanh toán. */
public interface OrderPort {

  /**
   * Ghi đơn mới.
   *
   * <p>SAP B1: GHI BẮT BUỘC qua Service Layer ({@code POST /Orders}) hoặc DI API —
   * INSERT thẳng vào ORDR/RDR1 phá tính toàn vẹn dữ liệu và mất hỗ trợ từ SAP.
   */
  Order create(Dealer dealer, List<OrderItem> items, long subtotal, String delivery,
               String payment, boolean overLimit, String channel, String createdAt);

  Optional<Order> get(String id);

  /** {@code dealerCode} null = tất cả đại lý. */
  List<Order> list(String dealerCode);

  Optional<Order> setStatus(String id, String status, String approver, String note);

  // --- Thanh toán & công nợ ---

  void addPayment(String dealerCode, String orderId, long amount, String method,
                  String createdAt);

  List<Payment> listPayments(String dealerCode);

  Set<String> paidOrderIds(String dealerCode);

  long outstandingCredit(String dealerCode);

  /** Đơn công nợ hiển thị như hoá đơn (kèm cờ {@code paid}). */
  List<Order> creditOrders(String dealerCode);
}

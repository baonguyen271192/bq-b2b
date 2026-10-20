package vn.com.giaybq.api.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Đơn SỈ của đại lý.
 *
 * @param overLimit vượt hạn mức công nợ khả dụng → phải chờ duyệt.
 * @param paid      chỉ có nghĩa khi đơn hiện ra như hoá đơn công nợ; null thì bỏ khỏi JSON.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Order(
    String id,
    String dealerCode,
    String dealerName,
    List<OrderItem> items,
    long subtotal,
    String delivery,
    String payment,
    String status,
    String channel,
    boolean overLimit,
    String createdAt,
    String approver,
    String approveNote,
    Boolean paid
) {
  public Order withPaid(boolean value) {
    return new Order(id, dealerCode, dealerName, items, subtotal, delivery, payment,
        status, channel, overLimit, createdAt, approver, approveNote, value);
  }
}

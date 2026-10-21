package vn.com.giaybq.api.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Đơn LẺ — khách vãng lai nhắn tin qua Facebook/Zalo, bot chốt đơn.
 *
 * <p>Khác đơn sỉ ở ba điểm: không có đại lý, không trừ hạn mức công nợ, và vòng đời
 * ngắn hơn (không có bước duyệt) — xem {@link vn.com.giaybq.api.service.RetailLifecycle}.
 *
 * @param senderId    mã người gửi của kênh chat (Facebook PSID...), để nối lại hội thoại.
 * @param flagged     bot đánh dấu đơn đáng ngờ (địa chỉ thiếu, số lượng bất thường).
 * @param paymentStatus {@code null} khi chưa thu tiền; {@code "cần hoàn tiền"} khi huỷ
 *                      đơn ĐÃ thu — hai việc khác nhau về kế toán, không gộp.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RetailOrder(
    String id,
    List<RetailOrderItem> items,
    long subtotal,
    String payment,
    String status,
    String channel,
    String createdAt,
    String customerName,
    String customerPhone,
    String customerAddress,
    String senderId,
    Boolean flagged,
    String flagNote,
    String paymentStatus
) {
  public RetailOrder withStatus(String value) {
    return new RetailOrder(id, items, subtotal, payment, value, channel, createdAt,
        customerName, customerPhone, customerAddress, senderId, flagged, flagNote,
        paymentStatus);
  }
}

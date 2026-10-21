package vn.com.giaybq.api.ports;

import java.util.List;
import java.util.Optional;
import vn.com.giaybq.api.domain.RetailOrder;
import vn.com.giaybq.api.domain.RetailOrderItem;

/**
 * Hợp đồng đơn LẺ.
 *
 * <p>Tách riêng khỏi {@link OrderPort} có chủ ý: đơn lẻ không có đại lý, không đụng hạn
 * mức công nợ, và khi nối SAP B1 nhiều khả năng ánh xạ sang loại chứng từ khác (khách
 * vãng lai thay vì Business Partner là đại lý). Gộp chung sẽ kéo hai nghiệp vụ khác
 * nhau vào một interface rồi phải cắt lại.
 */
public interface RetailOrderPort {

  /** Ghi đơn mới do bot chốt. Trạng thái khởi tạo do adapter đặt, không do caller. */
  RetailOrder create(List<RetailOrderItem> items, long subtotal, String payment,
                     String channel, String senderId, String customerName,
                     String customerPhone, String customerAddress, boolean flagged,
                     String flagNote, String createdAt);

  Optional<RetailOrder> get(String id);

  /** Mới nhất trước. */
  List<RetailOrder> list();

  Optional<RetailOrder> setStatus(String id, String status);

  /** Đánh dấu đơn cần hoàn tiền (huỷ đơn đã thu tiền). */
  void markRefundDue(String id);
}

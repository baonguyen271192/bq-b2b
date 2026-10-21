package vn.com.giaybq.api.adapters.sapb1;

import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.domain.RetailOrder;
import vn.com.giaybq.api.domain.RetailOrderItem;
import vn.com.giaybq.api.ports.NeedsMappingException;
import vn.com.giaybq.api.ports.RetailOrderPort;

/**
 * Đơn LẺ trên SAP B1 — CHƯA ánh xạ được, cố ý.
 *
 * <p>Đơn sỉ ánh xạ thẳng sang {@code Orders} với {@code CardCode} là đại lý. Đơn lẻ thì
 * khách là người vãng lai, không có Business Partner. B1 có vài cách làm việc này
 * (một BP gộp "khách lẻ", tạo BP cho từng khách, hoặc đi đường bán lẻ riêng) và chọn
 * sai là hỏng sổ công nợ. Đây là quyết định KẾ TOÁN của BQ, không phải kỹ thuật.
 *
 * <p>Ném lỗi rõ ràng thay vì đoán: {@code BQ_DATA_SOURCE=sapb1} vẫn khởi động được,
 * app đại lý và đơn sỉ chạy bình thường, chỉ riêng đơn lẻ báo đúng việc còn thiếu.
 * Xem {@code docs/sap-b1-mapping-proposal.md}.
 */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "sapb1")
class SapB1RetailOrders implements RetailOrderPort {

  private static final String REASON =
      "Đơn lẻ chưa có ánh xạ sang SAP B1: cần BQ chốt khách vãng lai ghi vào đâu "
          + "(một BusinessPartner gộp, BP theo từng khách, hay chứng từ bán lẻ riêng). "
          + "Xem docs/sap-b1-mapping-proposal.md.";

  @Override
  public RetailOrder create(List<RetailOrderItem> items, long subtotal, String payment,
                            String channel, String senderId, String customerName,
                            String customerPhone, String customerAddress, boolean flagged,
                            String flagNote, String createdAt) {
    throw new NeedsMappingException(REASON);
  }

  @Override
  public Optional<RetailOrder> get(String id) {
    throw new NeedsMappingException(REASON);
  }

  @Override
  public List<RetailOrder> list() {
    throw new NeedsMappingException(REASON);
  }

  @Override
  public Optional<RetailOrder> setStatus(String id, String status) {
    throw new NeedsMappingException(REASON);
  }

  @Override
  public void markRefundDue(String id) {
    throw new NeedsMappingException(REASON);
  }
}

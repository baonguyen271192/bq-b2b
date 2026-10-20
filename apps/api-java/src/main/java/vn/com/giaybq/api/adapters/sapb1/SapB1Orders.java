package vn.com.giaybq.api.adapters.sapb1;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.domain.OrderItem;
import vn.com.giaybq.api.domain.Payment;
import vn.com.giaybq.api.ports.NeedsMappingException;
import vn.com.giaybq.api.ports.OrderPort;

/**
 * Đơn sỉ ghi vào SAP B1 (Sales Order) qua Service Layer.
 *
 * <p>Ranh giới bất biến: GHI qua Service Layer, KHÔNG INSERT thẳng vào ORDR/RDR1.
 */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "sapb1")
class SapB1Orders implements OrderPort {

  private final ServiceLayerClient client;
  private final String warehouse;

  SapB1Orders(ServiceLayerClient client, BqProperties props) {
    this.client = client;
    String configured = props.sapb1().warehouse();
    this.warehouse = configured == null || configured.isBlank() ? "01" : configured;
  }

  @Override
  public Order create(Dealer dealer, List<OrderItem> items, long subtotal, String delivery,
                      String payment, boolean overLimit, String channel, String createdAt) {
    var payload = SapB1Mapping.orderToB1Payload(dealer, items, warehouse,
        "BQ " + channel + " · " + delivery + " · " + payment);
    return SapB1Mapping.b1OrderToOrder(client.post("/Orders", payload));
  }

  @Override
  public Optional<Order> get(String id) {
    var doc = client.get("/Orders(" + Integer.parseInt(id) + ")");
    return doc == null ? Optional.empty() : Optional.of(SapB1Mapping.b1OrderToOrder(doc));
  }

  @Override
  public List<Order> list(String dealerCode) {
    var path = new StringBuilder("/Orders?$orderby=DocEntry desc");
    if (dealerCode != null && !dealerCode.isBlank()) {
      path.append("&$filter=CardCode eq '").append(dealerCode).append("'");
    }
    var out = new ArrayList<Order>();
    client.listAll(path.toString()).forEach(d -> out.add(SapB1Mapping.b1OrderToOrder(d)));
    return out;
  }

  @Override
  public Optional<Order> setStatus(String id, String status, String approver, String note) {
    throw new NeedsMappingException(
        "Vòng đời đơn của BQ (Chờ xác nhận -> Đóng gói -> Bàn giao -> Đã nhận) chi tiết "
            + "hơn DocStatus của B1 (chỉ Open/Closed). Phải chốt: lưu bằng UDF trên "
            + "Orders, bằng chuỗi chứng từ (Delivery/Invoice), hay giữ ở DB BQ và chỉ "
            + "đẩy sang B1 ở các mốc kế toán.");
  }

  @Override
  public void addPayment(String dealerCode, String orderId, long amount, String method,
                         String createdAt) {
    throw new NeedsMappingException(
        "Thanh toán phải tạo IncomingPayments và đối trừ đúng hoá đơn — cần biết BQ đối "
            + "trừ theo hoá đơn (Invoice) hay theo đơn (Order).");
  }

  @Override
  public List<Payment> listPayments(String dealerCode) {
    throw new NeedsMappingException("Đọc IncomingPayments: cần chốt phạm vi ngày và cách lọc.");
  }

  @Override
  public Set<String> paidOrderIds(String dealerCode) {
    throw new NeedsMappingException("Phụ thuộc cách đối trừ ở addPayment.");
  }

  @Override
  public long outstandingCredit(String dealerCode) {
    // Số này B1 đã tính sẵn — dùng thẳng thay vì cộng lại từ đơn.
    var bp = client.get(
        "/BusinessPartners('" + dealerCode + "')?$select=CurrentAccountBalance");
    return bp == null ? 0 : bp.path("CurrentAccountBalance").asLong(0);
  }

  @Override
  public List<Order> creditOrders(String dealerCode) {
    throw new NeedsMappingException("Hoá đơn công nợ: đọc từ Invoices, cần chốt điều kiện lọc.");
  }
}

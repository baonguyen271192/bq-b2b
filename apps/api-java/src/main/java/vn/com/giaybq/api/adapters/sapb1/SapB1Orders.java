package vn.com.giaybq.api.adapters.sapb1;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
  private final OrderStatusMapping status;

  SapB1Orders(ServiceLayerClient client, BqProperties props) {
    this.client = client;
    String configured = props.sapb1().warehouse();
    this.warehouse = configured == null || configured.isBlank() ? "01" : configured;
    this.status = OrderStatusMapping.fromConfig(
        props.sapb1().orderStatusField(), props.sapb1().orderStatusValues());
  }

  /** $select cho Orders: các trường chuẩn + UDF chứa trạng thái của BQ. */
  private String orderSelect() {
    return "DocEntry,DocNum,CardCode,CardName,DocDate,DocTotal,Comments,DocumentLines,"
        + status.field();
  }

  @Override
  public Order create(Dealer dealer, List<OrderItem> items, long subtotal, String delivery,
                      String payment, boolean overLimit, String channel, String createdAt) {
    var payload = SapB1Mapping.orderToB1Payload(dealer, items, warehouse,
        "BQ " + channel + " · " + delivery + " · " + payment);
    return SapB1Mapping.b1OrderToOrder(client.post("/Orders", payload), status);
  }

  @Override
  public Optional<Order> get(String id) {
    var doc = client.get("/Orders(" + Integer.parseInt(id) + ")?$select=" + orderSelect());
    return doc == null ? Optional.empty()
                       : Optional.of(SapB1Mapping.b1OrderToOrder(doc, status));
  }

  @Override
  public List<Order> list(String dealerCode) {
    var path = new StringBuilder("/Orders?$select=" + orderSelect() + "&$orderby=DocEntry desc");
    if (dealerCode != null && !dealerCode.isBlank()) {
      path.append("&$filter=CardCode eq '").append(dealerCode).append("'");
    }
    var out = new ArrayList<Order>();
    client.listAll(path.toString())
        .forEach(d -> out.add(SapB1Mapping.b1OrderToOrder(d, status)));
    return out;
  }

  /**
   * Ghi trạng thái mới vào UDF trên Sales Order.
   *
   * <p>{@code approver}/{@code note} CHƯA được ghi sang B1 — cần BQ cho biết có trường
   * tương ứng không. Bỏ qua im lặng thì hơn là nhét vào Comments và ghi đè mất thông
   * tin kênh/giao hàng mà {@code orderToB1Payload} đã viết ở đó.
   */
  @Override
  public Optional<Order> setStatus(String id, String newStatus, String approver, String note) {
    String b1Value = status.toB1Value(newStatus).orElseThrow(() -> new NeedsMappingException(
        "Trạng thái '" + newStatus + "' không có trong SAPB1_ORDER_STATUS_VALUES. "
            + "Bổ sung ánh xạ cho trạng thái này."));

    client.patch("/Orders(" + Integer.parseInt(id) + ")", Map.of(status.field(), b1Value));
    return get(id);
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

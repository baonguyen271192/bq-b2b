package vn.com.giaybq.api.adapters.sapb1;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
  private final PaymentTarget paymentTarget;

  SapB1Orders(ServiceLayerClient client, BqProperties props) {
    this.client = client;
    String configured = props.sapb1().warehouse();
    this.warehouse = configured == null || configured.isBlank() ? "01" : configured;
    this.status = OrderStatusMapping.fromConfig(
        props.sapb1().orderStatusField(), props.sapb1().orderStatusValues());
    this.paymentTarget = PaymentTarget.from(props.sapb1().paymentTarget());
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
   * <p>Người duyệt và ghi chú duyệt chỉ được ghi khi BQ khai báo trường tương ứng
   * ({@code SAPB1_ORDER_APPROVER_FIELD}, {@code SAPB1_ORDER_APPROVE_NOTE_FIELD}).
   * Cố ý KHÔNG nhét vào {@code Comments}: trường đó đang giữ kênh/giao hàng/thanh toán
   * do {@code orderToB1Payload} ghi, đè lên là mất dữ liệu.
   */
  @Override
  public Optional<Order> setStatus(String id, String newStatus, String approver, String note) {
    String b1Value = status.toB1Value(newStatus).orElseThrow(() -> new NeedsMappingException(
        "Trạng thái '" + newStatus + "' không có trong SAPB1_ORDER_STATUS_VALUES. "
            + "Bổ sung ánh xạ cho trạng thái này."));

    var patch = new LinkedHashMap<String, Object>();
    patch.put(status.field(), b1Value);
    putIfFieldConfigured(patch, "SAPB1_ORDER_APPROVER_FIELD", approver);
    putIfFieldConfigured(patch, "SAPB1_ORDER_APPROVE_NOTE_FIELD", note);

    client.patch("/Orders(" + Integer.parseInt(id) + ")", patch);
    return get(id);
  }

  private static void putIfFieldConfigured(Map<String, Object> patch, String envVar,
                                           String value) {
    String field = System.getenv().getOrDefault(envVar, "");
    if (!field.isBlank() && value != null && !value.isBlank()) {
      patch.put(field.trim(), value);
    }
  }

  /**
   * Ghi nhận thanh toán: tạo {@code IncomingPayments} và đối trừ vào chứng từ nguồn.
   *
   * <p>Đối trừ vào hoá đơn hay vào đơn là quy trình kế toán của BQ — chọn bằng
   * {@code SAPB1_PAYMENT_TARGET}, cả hai đã hiện thực.
   */
  @Override
  public void addPayment(String dealerCode, String orderId, long amount, String method,
                         String createdAt) {
    var payload = new LinkedHashMap<String, Object>();
    payload.put("CardCode", dealerCode);
    payload.put("DocDate", toIsoDate(createdAt));
    // Số tiền đặt ở TransferSum (chuyển khoản) hay CashSum (tiền mặt) là khác nhau
    // trong B1; đặt sai thì sổ quỹ lệch dù tổng công nợ vẫn đúng.
    if (isCash(method)) {
      payload.put("CashSum", amount);
    } else {
      payload.put("TransferSum", amount);
    }
    payload.put("Remarks", "BQ · " + method);
    payload.put("PaymentInvoices",
        List.of(paymentTarget.paymentLine(Integer.parseInt(orderId), amount)));

    client.post("/IncomingPayments", payload);
  }

  @Override
  public List<Payment> listPayments(String dealerCode) {
    var out = new ArrayList<Payment>();
    for (var row : client.listAll(
        "/IncomingPayments?$select=DocEntry,DocDate,CardCode,CashSum,TransferSum,Remarks,"
            + "PaymentInvoices&$filter=CardCode eq '" + dealerCode + "'")) {
      long amount = Math.round(row.path("CashSum").asDouble(0))
          + Math.round(row.path("TransferSum").asDouble(0));
      var applied = row.path("PaymentInvoices");
      out.add(new Payment(
          "TT-" + row.path("DocEntry").asText(""),
          dealerCode,
          applied.isEmpty() ? null : applied.get(0).path("DocEntry").asText(),
          amount,
          row.path("Remarks").asText(""),
          SapB1Mapping.formatIsoDate(row.path("DocDate").asText(""))));
    }
    return out;
  }

  @Override
  public Set<String> paidOrderIds(String dealerCode) {
    var out = new LinkedHashSet<String>();
    for (var payment : listPayments(dealerCode)) {
      if (payment.orderId() != null) {
        out.add(payment.orderId());
      }
    }
    return out;
  }

  @Override
  public long outstandingCredit(String dealerCode) {
    // Số này B1 đã tính sẵn — dùng thẳng thay vì cộng lại từ đơn.
    var bp = client.get(
        "/BusinessPartners('" + dealerCode + "')?$select=CurrentAccountBalance");
    return bp == null ? 0 : bp.path("CurrentAccountBalance").asLong(0);
  }

  /**
   * Hoá đơn công nợ của một đại lý, kèm cờ đã thanh toán.
   *
   * <p>Đọc từ chứng từ nguồn tương ứng với {@code SAPB1_PAYMENT_TARGET}. Cờ {@code paid}
   * suy từ {@code DocumentStatus}: B1 tự đóng chứng từ khi đã thu đủ tiền.
   */
  @Override
  public List<Order> creditOrders(String dealerCode) {
    var paid = paidOrderIds(dealerCode);
    var out = new ArrayList<Order>();
    for (var doc : client.listAll(paymentTarget.sourceCollection()
        + "?$select=" + orderSelect() + ",DocumentStatus"
        + "&$filter=CardCode eq '" + dealerCode + "'&$orderby=DocEntry desc")) {
      var order = SapB1Mapping.b1OrderToOrder(doc, status);
      boolean settled = paid.contains(order.id())
          || "bost_Close".equals(doc.path("DocumentStatus").asText(""));
      out.add(order.withPaid(settled));
    }
    return out;
  }

  /** "dd/MM/yyyy HH:mm" (định dạng của BQ) -> "yyyy-MM-dd" (định dạng của B1). */
  private static String toIsoDate(String bqTimestamp) {
    if (bqTimestamp == null || bqTimestamp.length() < 10) {
      return java.time.LocalDate.now().toString();
    }
    return bqTimestamp.substring(6, 10) + "-" + bqTimestamp.substring(3, 5) + "-"
        + bqTimestamp.substring(0, 2);
  }

  private static boolean isCash(String method) {
    String m = method == null ? "" : method.toLowerCase(java.util.Locale.ROOT);
    return m.contains("tiền mặt") || m.contains("cash");
  }
}

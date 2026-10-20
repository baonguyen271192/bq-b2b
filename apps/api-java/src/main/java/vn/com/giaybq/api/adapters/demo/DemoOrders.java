package vn.com.giaybq.api.adapters.demo;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.domain.OrderItem;
import vn.com.giaybq.api.domain.Payment;
import vn.com.giaybq.api.ports.OrderPort;

/**
 * Đơn hàng demo trong SQLite — đọc đúng file {@code apps/api/app/orders.db} của bản
 * Python, nên lịch sử đơn demo không mất khi đổi backend sang Java.
 *
 * <p>Vì sao JDBC thuần mà không JPA: schema đã có sẵn (do Python tạo), chỉ cần vài câu
 * lệnh đơn giản, và đây là adapter SẮP BỊ THAY bằng SAP B1. Thêm JPA vào đây là thêm
 * một lớp mapping cho thứ có tuổi thọ ngắn.
 */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "demo", matchIfMissing = true)
class DemoOrders implements OrderPort {

  private final String jdbcUrl;
  private final Path dbPath;
  private final ObjectMapper mapper;
  private final Object writeLock = new Object();

  DemoOrders(BqProperties props, ObjectMapper mapper) {
    this.dbPath = Path.of(props.demo().ordersDb()).toAbsolutePath().normalize();
    this.jdbcUrl = "jdbc:sqlite:" + dbPath;
    this.mapper = mapper;
  }

  @PostConstruct
  void initDb() throws SQLException {
    if (!Files.exists(dbPath)) {
      // Không im lặng tạo DB rỗng ở sai đường dẫn — đó là cách bug "mất hết đơn"
      // xuất hiện. Báo rõ đường dẫn đang dùng.
      throw new IllegalStateException(
          "Không tìm thấy DB demo tại " + dbPath
              + ". Đặt lại bq.demo.orders-db (hoặc BQ_DEMO_ORDERS_DB).");
    }
    try (var c = DriverManager.getConnection(jdbcUrl); var st = c.createStatement()) {
      st.execute("""
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY, dealer_code TEXT NOT NULL, dealer_name TEXT NOT NULL,
            items_json TEXT NOT NULL, subtotal INTEGER NOT NULL, delivery TEXT,
            payment TEXT, status TEXT NOT NULL, channel TEXT NOT NULL,
            over_limit INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
            approver TEXT, approve_note TEXT)
          """);
      st.execute("""
          CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY, dealer_code TEXT NOT NULL, order_id TEXT,
            amount INTEGER NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL)
          """);
    }
  }

  @Override
  public Order create(Dealer dealer, List<OrderItem> items, long subtotal, String delivery,
                      String payment, boolean overLimit, String channel, String createdAt) {
    synchronized (writeLock) {
      String id = nextOrderId();
      String status = overLimit ? "Chờ duyệt (vượt hạn mức)" : "Chờ xác nhận";
      try (var c = DriverManager.getConnection(jdbcUrl);
           var ps = c.prepareStatement("""
               INSERT INTO orders (id, dealer_code, dealer_name, items_json, subtotal,
                 delivery, payment, status, channel, over_limit, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)
               """)) {
        ps.setString(1, id);
        ps.setString(2, dealer.code());
        ps.setString(3, dealer.name());
        ps.setString(4, mapper.writeValueAsString(items));
        ps.setLong(5, subtotal);
        ps.setString(6, delivery);
        ps.setString(7, payment);
        ps.setString(8, status);
        ps.setString(9, channel);
        ps.setInt(10, overLimit ? 1 : 0);
        ps.setString(11, createdAt);
        ps.executeUpdate();
      } catch (Exception e) {
        throw new IllegalStateException("Không ghi được đơn " + id, e);
      }
      return get(id).orElseThrow();
    }
  }

  /** Mã đơn kế tiếp, đọc từ đơn lớn nhất để không trùng sau khi restart. */
  private String nextOrderId() {
    long n = 1000;
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement(
             "SELECT id FROM orders WHERE id LIKE 'BQ%' ORDER BY id DESC LIMIT 1");
         var rs = ps.executeQuery()) {
      if (rs.next()) {
        try {
          n = Long.parseLong(rs.getString("id").replace("BQ", ""));
        } catch (NumberFormatException ignored) {
          // Mã không theo định dạng BQ<số> — giữ mốc mặc định.
        }
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được mã đơn kế tiếp", e);
    }
    return "BQ" + (n + 1);
  }

  @Override
  public Optional<Order> get(String id) {
    return queryOrders("SELECT * FROM orders WHERE id = ?", id).stream().findFirst();
  }

  @Override
  public List<Order> list(String dealerCode) {
    return dealerCode == null || dealerCode.isBlank()
        ? queryOrders("SELECT * FROM orders ORDER BY id DESC")
        : queryOrders("SELECT * FROM orders WHERE dealer_code = ? ORDER BY id DESC", dealerCode);
  }

  @Override
  public Optional<Order> setStatus(String id, String status, String approver, String note) {
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement(
             "UPDATE orders SET status = ?, approver = ?, approve_note = ? WHERE id = ?")) {
      ps.setString(1, status);
      ps.setString(2, approver);
      ps.setString(3, note);
      ps.setString(4, id);
      ps.executeUpdate();
    } catch (SQLException e) {
      throw new IllegalStateException("Không cập nhật được trạng thái đơn " + id, e);
    }
    return get(id);
  }

  @Override
  public void addPayment(String dealerCode, String orderId, long amount, String method,
                         String createdAt) {
    synchronized (writeLock) {
      try (var c = DriverManager.getConnection(jdbcUrl)) {
        long count;
        try (var ps = c.prepareStatement("SELECT COUNT(*) FROM payments");
             var rs = ps.executeQuery()) {
          rs.next();
          count = rs.getLong(1);
        }
        try (var ps = c.prepareStatement("""
            INSERT INTO payments (id, dealer_code, order_id, amount, method, created_at)
            VALUES (?,?,?,?,?,?)
            """)) {
          ps.setString(1, "TT-" + (1000 + count + 1));
          ps.setString(2, dealerCode);
          ps.setString(3, orderId);
          ps.setLong(4, amount);
          ps.setString(5, method);
          ps.setString(6, createdAt);
          ps.executeUpdate();
        }
      } catch (SQLException e) {
        throw new IllegalStateException("Không ghi được thanh toán cho đơn " + orderId, e);
      }
    }
  }

  @Override
  public List<Payment> listPayments(String dealerCode) {
    var out = new ArrayList<Payment>();
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement(
             "SELECT * FROM payments WHERE dealer_code = ? ORDER BY id DESC")) {
      ps.setString(1, dealerCode);
      try (var rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(new Payment(rs.getString("id"), rs.getString("dealer_code"),
              rs.getString("order_id"), rs.getLong("amount"), rs.getString("method"),
              rs.getString("created_at")));
        }
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được thanh toán của " + dealerCode, e);
    }
    return out;
  }

  @Override
  public Set<String> paidOrderIds(String dealerCode) {
    var out = new LinkedHashSet<String>();
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement("""
             SELECT DISTINCT order_id FROM payments
             WHERE dealer_code = ? AND order_id IS NOT NULL
             """)) {
      ps.setString(1, dealerCode);
      try (var rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(rs.getString("order_id"));
        }
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được danh sách đơn đã trả", e);
    }
    return out;
  }

  @Override
  public long outstandingCredit(String dealerCode) {
    var paid = paidOrderIds(dealerCode);
    return list(dealerCode).stream()
        .filter(DemoOrders::isCreditOrder)
        .filter(o -> !paid.contains(o.id()))
        .mapToLong(Order::subtotal)
        .sum();
  }

  @Override
  public List<Order> creditOrders(String dealerCode) {
    var paid = paidOrderIds(dealerCode);
    return list(dealerCode).stream()
        .filter(DemoOrders::isCreditOrder)
        .map(o -> o.withPaid(paid.contains(o.id())))
        .toList();
  }

  /**
   * Đơn tính vào công nợ: thanh toán bằng "Công nợ" và chưa bị huỷ/từ chối.
   *
   * <p>So khớp trên chuỗi tiếng Việt có dấu — cố ý KHÔNG bỏ dấu rồi so "huy"/"tu choi",
   * vì cách đó từng khớp nhầm các từ khác (xem commit 306c893 ở bản Python).
   */
  private static boolean isCreditOrder(Order o) {
    String status = o.status() == null ? "" : o.status().toLowerCase(Locale.ROOT);
    String payment = o.payment() == null ? "" : o.payment().toLowerCase(Locale.ROOT);
    return payment.contains("nợ")
        && !status.contains("huỷ")
        && !status.contains("hủy")
        && !status.contains("từ chối");
  }

  private List<Order> queryOrders(String sql, String... args) {
    var out = new ArrayList<Order>();
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement(sql)) {
      for (int i = 0; i < args.length; i++) {
        ps.setString(i + 1, args[i]);
      }
      try (var rs = ps.executeQuery()) {
        while (rs.next()) {
          out.add(toOrder(rs));
        }
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được đơn hàng", e);
    }
    return out;
  }

  private Order toOrder(ResultSet rs) throws SQLException {
    List<OrderItem> items;
    try {
      items = mapper.readValue(rs.getString("items_json"), new TypeReference<>() {});
    } catch (Exception e) {
      throw new IllegalStateException("items_json hỏng ở đơn " + rs.getString("id"), e);
    }
    return new Order(
        rs.getString("id"),
        rs.getString("dealer_code"),
        rs.getString("dealer_name"),
        items,
        rs.getLong("subtotal"),
        rs.getString("delivery"),
        rs.getString("payment"),
        rs.getString("status"),
        rs.getString("channel"),
        rs.getInt("over_limit") != 0,
        rs.getString("created_at"),
        rs.getString("approver"),
        rs.getString("approve_note"),
        null);
  }
}

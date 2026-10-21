package vn.com.giaybq.api.adapters.demo;

import jakarta.annotation.PostConstruct;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.domain.RetailOrder;
import vn.com.giaybq.api.domain.RetailOrderItem;
import vn.com.giaybq.api.ports.RetailOrderPort;
import vn.com.giaybq.api.service.RetailLifecycle;

/**
 * Đơn LẺ trong SQLite, dùng chung file DB với đơn sỉ (bảng riêng).
 *
 * <p>KHÔNG mồi dữ liệu mẫu: đơn lẻ bắt đầu từ trống và chỉ nhận đơn thật do bot chốt.
 * Đây là quyết định đã chốt khi tách khỏi service Commerce — lịch sử đơn cũ ở lại hệ
 * thống cũ, không di cư.
 *
 * <p>JDBC thuần như {@code DemoOrders}: vài câu lệnh đơn giản trên một adapter sẽ bị
 * SAP B1 thay thế.
 */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "demo", matchIfMissing = true)
class DemoRetailOrders implements RetailOrderPort {

  private final String jdbcUrl;
  private final Path dbPath;
  private final ObjectMapper mapper;
  private final Object writeLock = new Object();

  DemoRetailOrders(BqProperties props, ObjectMapper mapper) {
    this.dbPath = Path.of(props.demo().ordersDb()).toAbsolutePath().normalize();
    this.jdbcUrl = "jdbc:sqlite:" + dbPath;
    this.mapper = mapper;
  }

  @PostConstruct
  void initDb() throws SQLException {
    try {
      Files.createDirectories(dbPath.getParent());
    } catch (java.io.IOException e) {
      throw new IllegalStateException("Không tạo được thư mục cho DB demo: " + dbPath, e);
    }
    try (var c = DriverManager.getConnection(jdbcUrl); var st = c.createStatement()) {
      st.execute("""
          CREATE TABLE IF NOT EXISTS retail_orders (
            id TEXT PRIMARY KEY, items_json TEXT NOT NULL, subtotal INTEGER NOT NULL,
            payment TEXT, status TEXT NOT NULL, channel TEXT NOT NULL,
            created_at TEXT NOT NULL, customer_name TEXT, customer_phone TEXT,
            customer_address TEXT, sender_id TEXT, flagged INTEGER NOT NULL DEFAULT 0,
            flag_note TEXT, payment_status TEXT)
          """);
    }
  }

  @Override
  public RetailOrder create(List<RetailOrderItem> items, long subtotal, String payment,
                            String channel, String senderId, String customerName,
                            String customerPhone, String customerAddress, boolean flagged,
                            String flagNote, String createdAt) {
    synchronized (writeLock) {
      String id = nextId();
      try (var c = DriverManager.getConnection(jdbcUrl);
           var ps = c.prepareStatement("""
               INSERT INTO retail_orders (id, items_json, subtotal, payment, status,
                 channel, created_at, customer_name, customer_phone, customer_address,
                 sender_id, flagged, flag_note)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
               """)) {
        ps.setString(1, id);
        ps.setString(2, mapper.writeValueAsString(items));
        ps.setLong(3, subtotal);
        ps.setString(4, payment);
        ps.setString(5, RetailLifecycle.FIRST);
        ps.setString(6, channel);
        ps.setString(7, createdAt);
        ps.setString(8, customerName);
        ps.setString(9, customerPhone);
        ps.setString(10, customerAddress);
        ps.setString(11, senderId);
        ps.setInt(12, flagged ? 1 : 0);
        ps.setString(13, flagNote);
        ps.executeUpdate();
      } catch (Exception e) {
        throw new IllegalStateException("Không ghi được đơn lẻ " + id, e);
      }
      return get(id).orElseThrow();
    }
  }

  /**
   * Mã đơn lẻ kế tiếp. Tiền tố {@code BQL} tách hẳn khỏi {@code BQ} của đơn sỉ — hai
   * loại đơn hiện cạnh nhau trong admin, trùng mã là nhầm nghiệp vụ.
   */
  private String nextId() {
    long n = 1000;
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement(
             "SELECT id FROM retail_orders WHERE id LIKE 'BQL%' ORDER BY id DESC LIMIT 1");
         var rs = ps.executeQuery()) {
      if (rs.next()) {
        try {
          n = Long.parseLong(rs.getString("id").replace("BQL", ""));
        } catch (NumberFormatException ignored) {
          // Mã không theo định dạng BQL<số> — giữ mốc mặc định.
        }
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được mã đơn lẻ kế tiếp", e);
    }
    return "BQL" + (n + 1);
  }

  @Override
  public Optional<RetailOrder> get(String id) {
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement("SELECT * FROM retail_orders WHERE id = ?")) {
      ps.setString(1, id);
      try (var rs = ps.executeQuery()) {
        return rs.next() ? Optional.of(map(rs)) : Optional.empty();
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được đơn lẻ " + id, e);
    }
  }

  @Override
  public List<RetailOrder> list() {
    var out = new ArrayList<RetailOrder>();
    try (var c = DriverManager.getConnection(jdbcUrl);
         var ps = c.prepareStatement("SELECT * FROM retail_orders ORDER BY id DESC");
         var rs = ps.executeQuery()) {
      while (rs.next()) {
        out.add(map(rs));
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Không đọc được danh sách đơn lẻ", e);
    }
    return out;
  }

  @Override
  public Optional<RetailOrder> setStatus(String id, String status) {
    synchronized (writeLock) {
      try (var c = DriverManager.getConnection(jdbcUrl);
           var ps = c.prepareStatement("UPDATE retail_orders SET status = ? WHERE id = ?")) {
        ps.setString(1, status);
        ps.setString(2, id);
        if (ps.executeUpdate() == 0) {
          return Optional.empty();
        }
      } catch (SQLException e) {
        throw new IllegalStateException("Không đổi được trạng thái đơn lẻ " + id, e);
      }
      return get(id);
    }
  }

  @Override
  public void markRefundDue(String id) {
    synchronized (writeLock) {
      try (var c = DriverManager.getConnection(jdbcUrl);
           var ps = c.prepareStatement(
               "UPDATE retail_orders SET payment_status = ? WHERE id = ?")) {
        ps.setString(1, RetailLifecycle.REFUND_DUE);
        ps.setString(2, id);
        ps.executeUpdate();
      } catch (SQLException e) {
        throw new IllegalStateException("Không đánh dấu hoàn tiền cho " + id, e);
      }
    }
  }

  private RetailOrder map(ResultSet rs) throws SQLException {
    List<RetailOrderItem> items =
        mapper.readValue(rs.getString("items_json"), new TypeReference<>() {});
    return new RetailOrder(
        rs.getString("id"),
        items,
        rs.getLong("subtotal"),
        rs.getString("payment"),
        rs.getString("status"),
        rs.getString("channel"),
        rs.getString("created_at"),
        rs.getString("customer_name"),
        rs.getString("customer_phone"),
        rs.getString("customer_address"),
        rs.getString("sender_id"),
        rs.getInt("flagged") == 1,
        rs.getString("flag_note"),
        rs.getString("payment_status"));
  }
}

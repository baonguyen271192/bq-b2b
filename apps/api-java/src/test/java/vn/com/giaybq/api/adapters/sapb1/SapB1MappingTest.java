package vn.com.giaybq.api.adapters.sapb1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.OrderItem;
import vn.com.giaybq.api.ports.NeedsMappingException;

/**
 * Lớp ánh xạ này là nơi duy nhất quyết định đơn gửi lên ERP có đúng mã và đúng số
 * lượng hay không. Sai ở đây = ghi hỏng dữ liệu thật, nên test kỹ nhất ở đây.
 */
class SapB1MappingTest {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  /** Ánh xạ trạng thái mẫu, đúng dạng BQ sẽ điền khi cho biết tên trường UDF. */
  private static final OrderStatusMapping STATUS = OrderStatusMapping.fromConfig(
      "U_BQ_Status",
      "1:Chờ xác nhận,2:Đã xác nhận,3:Đang đóng gói,"
          + "4:Đang bàn giao vận chuyển,5:Đại lý đã nhận");

  @Nested
  @DisplayName("Tách mã hàng theo size")
  class ParseItemCode {

    @Test
    void tachDuocMaGocVaSize() {
      assertThat(SapB1Mapping.parseItemCode("GBW0295-36")).containsExactly("GBW0295", "36");
    }

    @Test
    @DisplayName("Mã phẳng (không mã hoá size) trả size = null, KHÔNG ném lỗi")
    void maPhangTraSizeNull() {
      assertThat(SapB1Mapping.parseItemCode("PHUKIEN01")).containsExactly("PHUKIEN01", null);
    }

    @Test
    void toItemCodeLaNghichDaoCuaParse() {
      String code = SapB1Mapping.toItemCode("GBW0295", "38");
      assertThat(code).isEqualTo("GBW0295-38");
      assertThat(SapB1Mapping.parseItemCode(code)).containsExactly("GBW0295", "38");
    }
  }

  @Nested
  @DisplayName("Đơn BQ -> payload Sales Order của B1")
  class ToB1Payload {

    private final Dealer dealer = new Dealer("DL001", "Đại lý Minh Anh", "Vàng",
        50_000_000, 0, "", "", "", "");

    @Test
    @DisplayName("Mỗi size thành một DocumentLine riêng")
    void moiSizeMotDong() {
      var item = new OrderItem("GBW0295", "Giày cao gót",
          Map.of("36", 2, "37", 3), 425_600, 5, 2_128_000);

      var payload = SapB1Mapping.orderToB1Payload(dealer, List.of(item), "01", "BQ web · · ");

      assertThat(payload).containsEntry("CardCode", "DL001");
      @SuppressWarnings("unchecked")
      var lines = (List<Map<String, Object>>) payload.get("DocumentLines");
      assertThat(lines).hasSize(2)
          .allSatisfy(l -> assertThat(l).containsEntry("WarehouseCode", "01")
              .containsEntry("UnitPrice", 425_600L))
          .extracting(l -> l.get("ItemCode"))
          .containsExactlyInAnyOrder("GBW0295-36", "GBW0295-37");
    }

    @Test
    @DisplayName("Size có số lượng 0 bị loại, không gửi dòng rỗng sang ERP")
    void bỏSizeSoLuongKhong() {
      var item = new OrderItem("GBW0295", "Giày", Map.of("36", 0, "37", 4), 100, 4, 400);

      @SuppressWarnings("unchecked")
      var lines = (List<Map<String, Object>>)
          SapB1Mapping.orderToB1Payload(dealer, List.of(item), "01", "").get("DocumentLines");

      assertThat(lines).hasSize(1);
      assertThat(lines.get(0)).containsEntry("ItemCode", "GBW0295-37");
    }

    @Test
    @DisplayName("Đơn không còn dòng hợp lệ thì ném lỗi, không gửi đơn rỗng")
    void donRongThiNemLoi() {
      var item = new OrderItem("GBW0295", "Giày", Map.of("36", 0), 100, 0, 0);

      assertThatThrownBy(() -> SapB1Mapping.orderToB1Payload(dealer, List.of(item), "01", ""))
          .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Comments dài bị cắt còn 254 ký tự (giới hạn của B1)")
    void cắtCommentsQuaDai() {
      var item = new OrderItem("GBW0295", "Giày", Map.of("36", 1), 100, 1, 100);

      var payload = SapB1Mapping.orderToB1Payload(dealer, List.of(item), "01", "x".repeat(400));

      assertThat((String) payload.get("Comments")).hasSize(254);
    }
  }

  @Nested
  @DisplayName("Sales Order của B1 -> đơn BQ")
  class FromB1Order {

    private static final String DOC = """
        {
          "DocEntry": 4521,
          "CardCode": "DL001",
          "CardName": "Đại lý Minh Anh",
          "DocDate": "2026-10-18",
          "DocTotal": 2128000,
          "Comments": "BQ web · Kho HCM · Công nợ",
          "U_BQ_Status": "3",
          "DocumentLines": [
            {"ItemCode":"GBW0295-36","ItemDescription":"Giày cao gót","Quantity":2,"UnitPrice":425600},
            {"ItemCode":"GBW0295-37","ItemDescription":"Giày cao gót","Quantity":3,"UnitPrice":425600}
          ]
        }
        """;

    @Test
    @DisplayName("Gom DocumentLines ngược lại thành bảng size")
    void gomLaiThanhBangSize() {
      var order = SapB1Mapping.b1OrderToOrder(JSON.readTree(DOC), STATUS);

      assertThat(order.id()).isEqualTo("4521");
      assertThat(order.dealerCode()).isEqualTo("DL001");
      assertThat(order.items()).hasSize(1);

      var item = order.items().get(0);
      assertThat(item.code()).isEqualTo("GBW0295");
      assertThat(item.sizes()).containsOnly(entry("36", 2), entry("37", 3));
      assertThat(item.qtyTotal()).isEqualTo(5);
      assertThat(item.unitPrice()).isEqualTo(425_600);
    }

    @Test
    @DisplayName("Trạng thái UDF '3' dịch thành nhãn tiếng Việt của BQ")
    void dichTrangThai() {
      assertThat(SapB1Mapping.b1OrderToOrder(JSON.readTree(DOC), STATUS).status())
          .isEqualTo("Đang đóng gói");
    }

    @Test
    @DisplayName("Kênh/giao hàng/thanh toán đọc lại được từ Comments")
    void docLaiComments() {
      var order = SapB1Mapping.b1OrderToOrder(JSON.readTree(DOC), STATUS);

      assertThat(order.channel()).isEqualTo("web");
      assertThat(order.delivery()).isEqualTo("Kho HCM");
      assertThat(order.payment()).isEqualTo("Công nợ");
    }

    @Test
    @DisplayName("DocDate ISO đổi sang dd/MM/yyyy mà KHÔNG bịa ra giờ")
    void doiDinhDangNgay() {
      assertThat(SapB1Mapping.b1OrderToOrder(JSON.readTree(DOC), STATUS).createdAt())
          .isEqualTo("18/10/2026 00:00");
    }

    @Test
    @DisplayName("DocTotal của B1 được ưu tiên hơn tổng tự cộng")
    void uuTienDocTotal() {
      String doc = DOC.replace("\"DocTotal\": 2128000", "\"DocTotal\": 2000000");

      assertThat(SapB1Mapping.b1OrderToOrder(JSON.readTree(doc), STATUS).subtotal())
          .isEqualTo(2_000_000);
    }

    @Test
    @DisplayName("Cùng mã + cùng size ở nhiều dòng thì CỘNG DỒN, không ghi đè")
    void congDonDongTrung() {
      String doc = """
          {"DocEntry":1,"DocumentLines":[
            {"ItemCode":"GBW0295-36","Quantity":2,"UnitPrice":100},
            {"ItemCode":"GBW0295-36","Quantity":3,"UnitPrice":100}]}
          """;

      var order = SapB1Mapping.b1OrderToOrder(JSON.readTree(doc), STATUS);

      assertThat(order.items().get(0).sizes()).containsExactly(entry("36", 5));
      assertThat(order.items().get(0).qtyTotal()).isEqualTo(5);
    }

    @Test
    @DisplayName("Mặt hàng mã phẳng vẫn giữ lại, không bị bỏ im lặng")
    void giuLaiMaPhang() {
      String doc = """
          {"DocEntry":1,"DocumentLines":[
            {"ItemCode":"PHUKIEN01","ItemDescription":"Hộp giày","Quantity":10,"UnitPrice":5000}]}
          """;

      var order = SapB1Mapping.b1OrderToOrder(JSON.readTree(doc), STATUS);

      assertThat(order.items()).hasSize(1);
      assertThat(order.items().get(0).code()).isEqualTo("PHUKIEN01");
      assertThat(order.items().get(0).qtyTotal()).isEqualTo(10);
    }
  }

  @Nested
  @DisplayName("Ánh xạ trạng thái")
  class StatusMapping {

    @Test
    void dichHaiChieu() {
      assertThat(STATUS.toBqLabel("5")).isEqualTo("Đại lý đã nhận");
      assertThat(STATUS.toB1Value("Đại lý đã nhận")).contains("5");
    }

    @Test
    @DisplayName("Giá trị lạ từ B1 trả nguyên văn, không nuốt mất")
    void giaTriLaTraNguyenVan() {
      assertThat(STATUS.toBqLabel("99")).isEqualTo("99");
    }

    @Test
    @DisplayName("Chưa cấu hình tên trường thì ném NeedsMapping, không đoán bừa")
    void chuaCauHinhThiNemLoi() {
      var chuaCauHinh = OrderStatusMapping.fromConfig("", "");

      assertThatThrownBy(chuaCauHinh::field)
          .isInstanceOf(NeedsMappingException.class)
          .hasMessageContaining("SAPB1_ORDER_STATUS_FIELD");
    }
  }
}

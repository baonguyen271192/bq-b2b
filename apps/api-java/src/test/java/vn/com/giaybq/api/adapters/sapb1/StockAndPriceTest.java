package vn.com.giaybq.api.adapters.sapb1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * Hai thứ quyết định "bán được bao nhiêu đôi" và "thu bao nhiêu tiền". Sai ở đây
 * không báo lỗi — chỉ ra số sai, nên test là cách duy nhất bắt được.
 */
class StockAndPriceTest {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  @Nested
  @DisplayName("Công thức tồn bán được")
  class Stock {

    /** Hai kho: kho 01 có 10 tồn / 3 đã giữ / 5 đang về; kho 02 có 7 / 0 / 0. */
    private static final String ITEM = """
        {"ItemWarehouseInfoCollection":[
          {"WarehouseCode":"01","InStock":10,"Committed":3,"Ordered":5},
          {"WarehouseCode":"02","InStock":7,"Committed":0,"Ordered":0}]}
        """;

    @Test
    @DisplayName("available (mặc định) = tồn trừ phần đã giữ cho đơn khác")
    void available() {
      int n = SapB1Mapping.availableStock(JSON.readTree(ITEM), "01", StockFormula.AVAILABLE);
      assertThat(n).isEqualTo(7);   // 10 - 3
    }

    @Test
    @DisplayName("in_stock KHÔNG trừ phần đã giữ — dễ bán vượt")
    void inStock() {
      int n = SapB1Mapping.availableStock(JSON.readTree(ITEM), "01", StockFormula.IN_STOCK);
      assertThat(n).isEqualTo(10);
    }

    @Test
    @DisplayName("available_with_incoming cộng thêm hàng đang về")
    void withIncoming() {
      int n = SapB1Mapping.availableStock(
          JSON.readTree(ITEM), "01", StockFormula.AVAILABLE_WITH_INCOMING);
      assertThat(n).isEqualTo(12);  // 10 - 3 + 5
    }

    @Test
    @DisplayName("Không lọc kho thì CỘNG MỌI KHO — ra số lớn hơn lượng thực bán sỉ được")
    void allWarehouses() {
      int n = SapB1Mapping.availableStock(JSON.readTree(ITEM), "", StockFormula.AVAILABLE);
      assertThat(n).isEqualTo(14);  // (10-3) + (7-0)
    }

    @Test
    @DisplayName("Tồn âm bị chặn ở 0, không trả số âm ra giao diện đặt hàng")
    void negativeClampedToZero() {
      String oversold = """
          {"ItemWarehouseInfoCollection":[{"WarehouseCode":"01","InStock":2,"Committed":9}]}
          """;
      assertThat(SapB1Mapping.availableStock(
          JSON.readTree(oversold), "01", StockFormula.AVAILABLE)).isZero();
    }

    @Test
    void congThucLaKhongHopLeThiBaoLoiRo() {
      assertThatThrownBy(() -> StockFormula.from("tuỳ_tiện"))
          .isInstanceOf(IllegalStateException.class)
          .hasMessageContaining("SAPB1_STOCK_FORMULA");
    }

    @Test
    void mặcĐịnhLàAvailable() {
      assertThat(StockFormula.from(null)).isEqualTo(StockFormula.AVAILABLE);
      assertThat(StockFormula.from("")).isEqualTo(StockFormula.AVAILABLE);
    }
  }

  @Nested
  @DisplayName("Bảng giá")
  class Prices {

    private PriceBook bookWithTwoLists() {
      var book = new PriceBook();
      book.addItemPrices("GBW0295", JSON.readTree("""
          {"ItemPrices":[
            {"PriceList":1,"Price":500000},
            {"PriceList":3,"Price":448000}]}
          """));
      return book;
    }

    @Test
    @DisplayName("Tra đúng giá theo bảng giá của đại lý")
    void traTheoBangGia() {
      assertThat(bookWithTwoLists().priceFor("GBW0295", 3)).contains(448_000L);
      assertThat(bookWithTwoLists().priceFor("GBW0295", 1)).contains(500_000L);
    }

    @Test
    @DisplayName("SpecialPrices GHI ĐÈ bảng giá — đúng thứ tự ưu tiên của B1")
    void specialPriceGhiDe() {
      var book = bookWithTwoLists();
      book.addSpecialPrice("GBW0295", 399_000);

      assertThat(book.priceFor("GBW0295", 3)).contains(399_000L);
    }

    @Test
    @DisplayName("Không có giá thì trả rỗng, KHÔNG trả 0")
    void khongCoGiaThiRong() {
      assertThat(bookWithTwoLists().priceFor("GBW0295", 99)).isEmpty();
      assertThat(bookWithTwoLists().priceFor("KHONGCO", 1)).isEmpty();
    }

    @Test
    @DisplayName("Dòng giá null bị bỏ qua, không thành giá 0")
    void boQuaGiaNull() {
      var book = new PriceBook();
      book.addItemPrices("X", JSON.readTree("""
          {"ItemPrices":[{"PriceList":1,"Price":null}]}
          """));

      assertThat(book.priceFor("X", 1)).isEmpty();
    }
  }

  @Nested
  @DisplayName("Đối trừ thanh toán")
  class Payments {

    @Test
    @DisplayName("Đối trừ vào hoá đơn (quy trình chuẩn)")
    void vaoHoaDon() {
      var line = PaymentTarget.INVOICE.paymentLine(4521, 2_128_000);

      assertThat(line)
          .containsEntry("DocEntry", 4521)
          .containsEntry("SumApplied", 2_128_000L)
          .containsEntry("InvoiceType", "it_Invoice");
      assertThat(PaymentTarget.INVOICE.sourceCollection()).isEqualTo("/Invoices");
    }

    @Test
    @DisplayName("Đối trừ thẳng vào đơn bán")
    void vaoDonBan() {
      assertThat(PaymentTarget.ORDER.paymentLine(1, 100))
          .containsEntry("InvoiceType", "it_Order");
      assertThat(PaymentTarget.ORDER.sourceCollection()).isEqualTo("/Orders");
    }

    @Test
    void mặcĐịnhLàHoaDon() {
      assertThat(PaymentTarget.from(null)).isEqualTo(PaymentTarget.INVOICE);
    }

    @Test
    void giaTriLaThiBaoLoiRo() {
      assertThatThrownBy(() -> PaymentTarget.from("tiền mặt"))
          .isInstanceOf(IllegalStateException.class)
          .hasMessageContaining("SAPB1_PAYMENT_TARGET");
    }
  }
}

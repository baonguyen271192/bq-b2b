package vn.com.giaybq.api.adapters.sapb1;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import tools.jackson.databind.JsonNode;

/**
 * Bảng giá đã nạp sẵn cho một lượt đọc danh mục.
 *
 * <p><b>Vì sao tồn tại:</b> {@code CatalogController.products()} gọi
 * {@code dealerPrice()} cho TỪNG sản phẩm. Nếu mỗi lần gọi là một request sang B1 thì
 * 258 mẫu = 258 request — hỏng ngay từ lần mở trang đầu tiên (bài toán N+1 kinh điển).
 *
 * <p>Nên giá được nạp CÙNG LÚC với danh mục (thêm {@code ItemPrices} vào {@code $select}
 * của {@code /Items}, không tốn thêm request nào), rồi tra trong bộ nhớ.
 *
 * <p>Thứ tự ưu tiên theo đúng cách B1 tính: <b>SpecialPrices</b> (giá riêng cho cặp
 * khách–mặt hàng) ghi đè <b>PriceLists</b> (bảng giá gán cho khách).
 */
final class PriceBook {

  /** mã gốc sản phẩm -> (số bảng giá -> giá) */
  private final Map<String, Map<Integer, Long>> byPriceList = new LinkedHashMap<>();

  /** mã gốc sản phẩm -> giá riêng của đại lý đang xét */
  private final Map<String, Long> special = new HashMap<>();

  /**
   * Gom giá từ các dòng {@code /Items}. Mỗi size là một ItemCode riêng nhưng cùng mã
   * gốc; giá lấy theo dòng ĐẦU TIÊN gặp của mã gốc đó.
   *
   * <p>[Unverified] Giả định các size của cùng một mẫu có cùng giá — đúng với cách BQ
   * bán sỉ hiện tại (bảng giá theo mẫu, không theo size). Nếu B1 của BQ đặt giá khác
   * nhau theo size thì phải đổi {@link #priceFor} sang tra theo ItemCode đầy đủ.
   */
  void addItemPrices(String baseCode, JsonNode itemRow) {
    var prices = byPriceList.computeIfAbsent(baseCode, k -> new LinkedHashMap<>());
    for (var priceRow : itemRow.path("ItemPrices")) {
      int priceList = priceRow.path("PriceList").asInt(-1);
      if (priceList < 0 || priceRow.path("Price").isNull()) {
        continue;
      }
      prices.putIfAbsent(priceList, Math.round(priceRow.path("Price").asDouble(0)));
    }
  }

  /** Nạp giá riêng theo khách từ {@code /SpecialPrices}. */
  void addSpecialPrice(String baseCode, long price) {
    special.putIfAbsent(baseCode, price);
  }

  /**
   * Giá cuối cùng cho một mã gốc theo bảng giá của đại lý.
   *
   * @return rỗng khi B1 không có giá nào — caller phải quyết định dùng gì thay thế,
   *     thay vì lặng lẽ trả 0 (giá 0 trên đơn hàng là lỗi không ai phát hiện kịp).
   */
  Optional<Long> priceFor(String baseCode, int priceListNum) {
    Long overridden = special.get(baseCode);
    if (overridden != null) {
      return Optional.of(overridden);
    }
    return Optional.ofNullable(byPriceList.getOrDefault(baseCode, Map.of()).get(priceListNum));
  }

  boolean isEmpty() {
    return byPriceList.isEmpty() && special.isEmpty();
  }
}

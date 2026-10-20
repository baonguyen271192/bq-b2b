package vn.com.giaybq.api.adapters.sapb1;

import java.util.Locale;
import tools.jackson.databind.JsonNode;

/**
 * "Đôi nào được coi là bán được" — đây là CHÍNH SÁCH BÁN HÀNG của BQ, không phải
 * quyết định kỹ thuật. Ba cách tính phổ biến đều đã hiện thực sẵn; chọn bằng
 * {@code SAPB1_STOCK_FORMULA}, không phải sửa code.
 */
enum StockFormula {

  /** Tồn thực tế trong kho. Dễ bán vượt vì không trừ phần đã giữ cho đơn khác. */
  IN_STOCK {
    @Override
    int compute(JsonNode warehouseRow) {
      return warehouseRow.path("InStock").asInt(0);
    }
  },

  /** Tồn trừ phần đã cam kết cho đơn khác. Mặc định, an toàn nhất. */
  AVAILABLE {
    @Override
    int compute(JsonNode warehouseRow) {
      return warehouseRow.path("InStock").asInt(0) - warehouseRow.path("Committed").asInt(0);
    }
  },

  /**
   * Cộng thêm hàng đang về (đơn mua chưa nhận) — cho phép bán trước.
   * Chỉ dùng khi BQ chấp nhận rủi ro hàng về trễ.
   */
  AVAILABLE_WITH_INCOMING {
    @Override
    int compute(JsonNode warehouseRow) {
      return warehouseRow.path("InStock").asInt(0)
          - warehouseRow.path("Committed").asInt(0)
          + warehouseRow.path("Ordered").asInt(0);
    }
  };

  abstract int compute(JsonNode warehouseRow);

  static StockFormula from(String raw) {
    if (raw == null || raw.isBlank()) {
      return AVAILABLE;
    }
    try {
      return valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException(
          "SAPB1_STOCK_FORMULA='" + raw + "' không hợp lệ. Chọn: in_stock, available, "
              + "available_with_incoming.");
    }
  }
}

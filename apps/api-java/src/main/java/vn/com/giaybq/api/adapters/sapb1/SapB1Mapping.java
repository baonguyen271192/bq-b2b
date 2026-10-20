package vn.com.giaybq.api.adapters.sapb1;

import tools.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Order;
import vn.com.giaybq.api.domain.OrderItem;
import vn.com.giaybq.api.domain.Product;
import vn.com.giaybq.api.ports.NeedsMappingException;

/**
 * Ánh xạ entity SAP B1 ⇄ model BQ. TẬP TRUNG mọi giả định về cấu hình B1 của BQ ở
 * một chỗ: khi bản cài thật khác giả định, chỉ phải sửa file này.
 */
public final class SapB1Mapping {

  private SapB1Mapping() {}

  // --- Bảng size: điểm rủi ro số 1 ------------------------------------------------
  //
  // B1 KHÔNG có size-matrix gốc. Giả định mặc định: mỗi size là một ItemCode dạng
  // "<mã gốc>-<size>" (vd GBW0295-35). Đổi bằng biến môi trường, không sửa code:
  //
  //   SAPB1_SKU_PATTERN=^(?<base>[A-Za-z0-9]+)-(?<size>\d{2})$
  //
  // Nếu BQ dùng cách khác (UDF U_Size trên Items, add-on matrix, hay ItemCode phẳng),
  // chỉ hàm parseItemCode phải viết lại.
  private static final Pattern SKU = Pattern.compile(
      System.getenv().getOrDefault("SAPB1_SKU_PATTERN",
          "^(?<base>[A-Za-z0-9]+)-(?<size>\\d{2})$"));

  /** Tách ItemCode thành (mã gốc, size). size = null khi mã không khớp mẫu. */
  public static String[] parseItemCode(String itemCode) {
    var m = SKU.matcher(itemCode);
    return m.matches() ? new String[] {m.group("base"), m.group("size")}
                       : new String[] {itemCode, null};
  }

  /** Nghịch đảo của parseItemCode. Phải đổi kèm khi đổi quy tắc mã. */
  public static String toItemCode(String baseCode, String size) {
    return baseCode + "-" + size;
  }

  /**
   * Gom nhiều dòng Items của B1 thành sản phẩm BQ có bảng size.
   *
   * @param warehouseCode lọc tồn theo một kho; null = cộng mọi kho (ra số LỚN HƠN
   *                      lượng thực bán được).
   */
  public static List<Product> groupItemsToProducts(List<JsonNode> rows, String warehouseCode) {
    var grouped = new LinkedHashMap<String, Map<String, Integer>>();
    var names = new LinkedHashMap<String, String>();
    var groups = new LinkedHashMap<String, String>();

    for (var row : rows) {
      String itemCode = row.path("ItemCode").asText("");
      var parsed = parseItemCode(itemCode);
      String base = parsed[0];
      String size = parsed[1];

      names.putIfAbsent(base, row.path("ItemName").asText(base));
      groups.putIfAbsent(base, row.path("ItemsGroupCode").asText(""));
      var sizes = grouped.computeIfAbsent(base, k -> new LinkedHashMap<>());
      if (size != null) {
        sizes.put(size, inStock(row, warehouseCode));
      }
    }

    var out = new ArrayList<Product>(grouped.size());
    grouped.forEach((base, sizes) -> out.add(new Product(
        base, names.get(base), groups.get(base),
        0, 0, 0,          // giá lấy riêng qua PriceLists/SpecialPrices, không nằm ở Items
        sizes, "", List.of(), List.of())));
    return out;
  }

  /**
   * Tồn khả dụng từ ItemWarehouseInfoCollection.
   *
   * <p>[Unverified] "Đôi nào được coi là bán được" là quyết định NGHIỆP VỤ của BQ, không
   * phải kỹ thuật — phải chốt trước khi tin công thức này. Hiện dùng InStock - Committed.
   */
  private static int inStock(JsonNode itemRow, String warehouseCode) {
    int total = 0;
    for (var wh : itemRow.path("ItemWarehouseInfoCollection")) {
      if (warehouseCode != null && !warehouseCode.isBlank()
          && !warehouseCode.equals(wh.path("WarehouseCode").asText())) {
        continue;
      }
      total += wh.path("InStock").asInt(0) - wh.path("Committed").asInt(0);
    }
    return Math.max(total, 0);
  }

  // --- Đại lý ---------------------------------------------------------------------

  /**
   * BusinessPartner (cCustomer) -> đại lý BQ.
   *
   * <p>{@code CurrentAccountBalance} là công nợ do ERP tính — KHÔNG tự cộng lại từ đơn
   * như adapter demo, vì ERP mới là nguồn sự thật về kế toán.
   */
  public static Dealer businessPartnerToDealer(JsonNode bp) {
    return new Dealer(
        bp.path("CardCode").asText(""),
        bp.path("CardName").asText(""),
        priceListToTier(bp.path("PriceListNum").asText(null)),
        bp.path("CreditLimit").asLong(0),
        bp.path("CurrentAccountBalance").asLong(0),
        bp.path("ContactPerson").asText(""),
        bp.path("Phone1").asText(""),
        bp.path("EmailAddress").asText(""),
        bp.path("Address").asText(""));
  }

  /**
   * Số bảng giá B1 -> bậc đại lý BQ. Ánh xạ nằm ở biến môi trường vì đây là cấu hình
   * vận hành, không phải code:
   * {@code SAPB1_TIER_BY_PRICELIST=1:Đồng,2:Bạc,3:Vàng,4:Kim Cương}
   */
  public static String priceListToTier(String priceListNum) {
    String raw = System.getenv().getOrDefault("SAPB1_TIER_BY_PRICELIST", "");
    if (raw.isBlank()) {
      throw new NeedsMappingException(
          "Chưa biết bảng giá nào của B1 ứng với bậc nào của BQ. Đặt "
              + "SAPB1_TIER_BY_PRICELIST, vd '1:Đồng,2:Bạc,3:Vàng,4:Kim Cương'.");
    }
    for (var pair : raw.split(",")) {
      var kv = pair.split(":", 2);
      if (kv.length == 2 && kv[0].trim().equals(priceListNum)) {
        return kv[1].trim();
      }
    }
    return "Đồng";
  }

  // --- Đơn hàng -------------------------------------------------------------------

  /**
   * Đơn BQ -> payload {@code POST /Orders}.
   *
   * <p>Mỗi (mã sản phẩm, size) thành MỘT DocumentLine riêng, vì B1 đếm số lượng theo
   * ItemCode chứ không theo lưới size.
   */
  public static Map<String, Object> orderToB1Payload(Dealer dealer, List<OrderItem> items,
                                                     String warehouseCode, String comments) {
    var lines = new ArrayList<Map<String, Object>>();
    for (var item : items) {
      item.sizes().forEach((size, qty) -> {
        if (qty > 0) {
          lines.add(Map.of(
              "ItemCode", toItemCode(item.code(), size),
              "Quantity", qty,
              "UnitPrice", item.unitPrice(),
              "WarehouseCode", warehouseCode));
        }
      });
    }
    if (lines.isEmpty()) {
      throw new IllegalArgumentException("Đơn không có dòng nào có số lượng > 0.");
    }
    return Map.of(
        "CardCode", dealer.code(),
        "Comments", comments.length() > 254 ? comments.substring(0, 254) : comments,
        "DocumentLines", lines);
  }

  /** Sales Order của B1 -> đơn BQ (gom DocumentLines ngược lại thành bảng size). */
  public static Order b1OrderToOrder(JsonNode doc) {
    throw new NeedsMappingException(
        "Cần biết BQ lưu trạng thái đơn ở đâu trong B1 (DocStatus chuẩn, U_* UDF, hay "
            + "bảng phụ) mới ánh xạ ngược được vòng đời 'Chờ xác nhận -> ... -> Đã nhận'.");
  }
}

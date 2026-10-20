package vn.com.giaybq.api.adapters.sapb1;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Product;
import vn.com.giaybq.api.ports.CatalogPort;
import vn.com.giaybq.api.ports.ErpOwnedException;

/** Danh mục, tồn kho và giá từ SAP B1 Service Layer. */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "sapb1")
class SapB1Catalog implements CatalogPort {

  private static final Logger log = LoggerFactory.getLogger(SapB1Catalog.class);

  /**
   * $select giới hạn cột để không kéo về cả trăm trường của OITM.
   * {@code ItemPrices} đi kèm ở đây là cố ý: nhờ vậy giá có sẵn khi dựng danh mục,
   * không phải hỏi lại B1 cho từng sản phẩm (xem {@link PriceBook}).
   */
  private static final String ITEM_SELECT =
      "ItemCode,ItemName,ItemsGroupCode,ItemWarehouseInfoCollection,ItemPrices";

  private static final String OWNED_BY_ERP =
      "Danh mục sản phẩm do SAP B1 làm chủ — tạo/sửa/xoá mặt hàng thực hiện trong ERP, "
          + "không từ app bán hàng.";

  private final ServiceLayerClient client;
  private final String warehouse;
  private final StockFormula stockFormula;
  private final boolean useSpecialPrices;
  private final TtlCache cache;

  SapB1Catalog(ServiceLayerClient client, BqProperties props) {
    this.client = client;
    this.warehouse = props.sapb1().warehouse();
    this.stockFormula = StockFormula.from(props.sapb1().stockFormula());
    this.useSpecialPrices = props.sapb1().useSpecialPrices();
    this.cache = new TtlCache(props.sapb1().catalogCacheTtl());
  }

  @Override
  public List<String> categories() {
    return cache.get("categories", () -> {
      var out = new ArrayList<String>();
      for (var row : client.listAll("/ItemGroups?$select=Number,GroupName")) {
        String name = row.path("GroupName").asText("");
        if (!name.isBlank()) {
          out.add(name);
        }
      }
      return out;
    });
  }

  @Override
  public List<Product> products(String category) {
    return loadCatalog(category).products();
  }

  /**
   * Một sản phẩm cụ thể.
   *
   * <p>KHÔNG cache: hàm này được gọi ngay trước khi chốt đơn để kiểm tồn theo size —
   * đọc số tồn cũ ở đây nghĩa là bán vượt hàng. Chịu thêm một request để đổi lấy số đúng.
   */
  @Override
  public Optional<Product> product(String code) {
    // Một "sản phẩm BQ" = nhiều ItemCode (mỗi size một mã) → lọc theo tiền tố.
    var rows = client.listAll(
        "/Items?$select=" + ITEM_SELECT + "&$filter=startswith(ItemCode,'" + code + "')");
    return SapB1Mapping.groupItemsToProducts(rows, warehouse, stockFormula, null)
        .stream().findFirst();
  }

  /**
   * Giá sỉ cho một đại lý.
   *
   * <p>Theo đúng thứ tự ưu tiên của B1: {@code SpecialPrices} (giá riêng cho cặp
   * khách–mặt hàng) ghi đè bảng giá gán trên hồ sơ khách.
   *
   * <p>Khi B1 không có giá nào cho mã này, trả về {@code wholesale} của sản phẩm thay
   * vì 0 — và ghi log cảnh báo. Giá 0 trên đơn hàng là lỗi không ai phát hiện kịp.
   */
  @Override
  public long dealerPrice(Product product, Dealer dealer) {
    var catalog = loadCatalog(null);
    int priceListNum = SapB1Mapping.tierToPriceList(dealer.tier());
    var book = catalog.priceBook();

    if (useSpecialPrices) {
      specialPrices(dealer.code()).forEach(book::addSpecialPrice);
    }

    return book.priceFor(product.code(), priceListNum).orElseGet(() -> {
      log.warn("SAP B1 không có giá cho {} ở bảng giá {} (đại lý {}); dùng giá sỉ cơ bản.",
          product.code(), priceListNum, dealer.code());
      return product.wholesale();
    });
  }

  /**
   * Giá riêng của một đại lý cho MỌI mặt hàng, lấy bằng một request duy nhất.
   *
   * <p>Cache theo đại lý: trang danh mục gọi {@code dealerPrice} cho từng sản phẩm,
   * nếu mỗi lần là một request thì 258 mẫu = 258 request.
   */
  private Map<String, Long> specialPrices(String dealerCode) {
    return cache.get("special:" + dealerCode, () -> {
      var out = new java.util.LinkedHashMap<String, Long>();
      for (var row : client.listAll(
          "/SpecialPrices?$select=ItemCode,Price&$filter=CardCode eq '" + dealerCode + "'")) {
        var parsed = SapB1Mapping.parseItemCode(row.path("ItemCode").asText(""));
        out.putIfAbsent(parsed[0], Math.round(row.path("Price").asDouble(0)));
      }
      return out;
    });
  }

  /** Danh mục + bảng giá nạp chung một lượt, cache chung một khoá. */
  private Catalog loadCatalog(String category) {
    String key = "catalog:" + (category == null || category.isBlank() ? "*" : category);
    return cache.get(key, () -> {
      var path =
          new StringBuilder("/Items?$select=" + ITEM_SELECT + "&$filter=SalesItem eq 'tYES'");
      if (category != null && !category.isBlank()) {
        path.append(" and ItemsGroupCode eq ").append(Integer.parseInt(category));
      }
      var priceBook = new PriceBook();
      var products = SapB1Mapping.groupItemsToProducts(
          client.listAll(path.toString()), warehouse, stockFormula, priceBook);
      return new Catalog(products, priceBook);
    });
  }

  private record Catalog(List<Product> products, PriceBook priceBook) {}

  // --- Dữ liệu do ERP làm chủ: từ chối ghi, không ghi ngược ---

  @Override
  public Product add(Product product) {
    throw new ErpOwnedException(OWNED_BY_ERP);
  }

  @Override
  public Optional<Product> update(String code, Product patch) {
    throw new ErpOwnedException(OWNED_BY_ERP);
  }

  @Override
  public boolean remove(String code) {
    throw new ErpOwnedException(OWNED_BY_ERP);
  }

  @Override
  public Optional<Product> setStock(String code, Map<String, Integer> sizes) {
    // Sửa tồn phải đi qua chứng từ kho (Goods Receipt / Inventory Posting), không
    // ghi đè trường InStock.
    throw new ErpOwnedException("Không sửa tồn kho từ BQ — tồn do SAP B1 làm chủ.");
  }
}

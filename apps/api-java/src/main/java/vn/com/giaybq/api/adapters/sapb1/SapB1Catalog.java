package vn.com.giaybq.api.adapters.sapb1;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.Product;
import vn.com.giaybq.api.ports.CatalogPort;
import vn.com.giaybq.api.ports.ErpOwnedException;
import vn.com.giaybq.api.ports.NeedsMappingException;

/** Danh mục từ SAP B1 Service Layer. */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "sapb1")
class SapB1Catalog implements CatalogPort {

  /** $select giới hạn cột để không kéo về cả trăm trường của OITM. */
  private static final String ITEM_SELECT =
      "ItemCode,ItemName,ItemsGroupCode,ItemWarehouseInfoCollection";

  private static final String OWNED_BY_ERP =
      "Danh mục sản phẩm do SAP B1 làm chủ — tạo/sửa/xoá mặt hàng thực hiện trong ERP, "
          + "không từ app bán hàng.";

  private final ServiceLayerClient client;
  private final String warehouse;
  private final TtlCache cache;

  SapB1Catalog(ServiceLayerClient client, BqProperties props) {
    this.client = client;
    this.warehouse = props.sapb1().warehouse();
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
    // Khoá cache gồm cả nhóm hàng: lọc theo nhóm là truy vấn khác, kết quả khác.
    String key = "products:" + (category == null || category.isBlank() ? "*" : category);
    return cache.get(key, () -> {
      var path =
          new StringBuilder("/Items?$select=" + ITEM_SELECT + "&$filter=SalesItem eq 'tYES'");
      if (category != null && !category.isBlank()) {
        path.append(" and ItemsGroupCode eq ").append(Integer.parseInt(category));
      }
      return SapB1Mapping.groupItemsToProducts(client.listAll(path.toString()), warehouse);
    });
  }

  /**
   * Một sản phẩm cụ thể.
   *
   * <p>KHÔNG cache: hàm này được gọi ngay trước khi chốt đơn để kiểm tồn theo size —
   * đọc số tồn cũ ở đây nghĩa là bán vượt hàng. Chịu thêm một request sang ERP để
   * đổi lấy số đúng.
   */
  @Override
  public Optional<Product> product(String code) {
    // Một "sản phẩm BQ" = nhiều ItemCode (mỗi size một mã) → lọc theo tiền tố.
    var rows = client.listAll(
        "/Items?$select=" + ITEM_SELECT + "&$filter=startswith(ItemCode,'" + code + "')");
    return SapB1Mapping.groupItemsToProducts(rows, warehouse).stream().findFirst();
  }

  @Override
  public long dealerPrice(Product product, Dealer dealer) {
    throw new NeedsMappingException(
        "Giá sỉ theo đại lý: cần chốt lấy từ PriceLists gán cho BusinessPartner, hay "
            + "SpecialPrices theo cặp khách–hàng, hay UDF riêng của BQ.");
  }

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

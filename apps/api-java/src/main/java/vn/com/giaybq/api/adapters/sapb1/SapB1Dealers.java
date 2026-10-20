package vn.com.giaybq.api.adapters.sapb1;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.ports.DealerPort;
import vn.com.giaybq.api.ports.ErpOwnedException;

/** Đại lý từ SAP B1 (BusinessPartners, CardType cCustomer). */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "sapb1")
class SapB1Dealers implements DealerPort {

  private static final String SELECT =
      "CardCode,CardName,PriceListNum,CreditLimit,CurrentAccountBalance,"
          + "ContactPerson,Phone1,EmailAddress,Address";

  private final ServiceLayerClient client;

  SapB1Dealers(ServiceLayerClient client) {
    this.client = client;
  }

  @Override
  public List<Dealer> all() {
    var rows = client.listAll(
        "/BusinessPartners?$select=" + SELECT + "&$filter=CardType eq 'cCustomer'");
    var out = new ArrayList<Dealer>(rows.size());
    rows.forEach(r -> out.add(SapB1Mapping.businessPartnerToDealer(r)));
    return out;
  }

  @Override
  public Optional<Dealer> get(String code) {
    var bp = client.get("/BusinessPartners('" + code + "')?$select=" + SELECT);
    return bp == null ? Optional.empty()
                      : Optional.of(SapB1Mapping.businessPartnerToDealer(bp));
  }

  @Override
  public long creditUsed(Dealer dealer) {
    // ERP là nguồn sự thật: đọc thẳng số dư, không cộng lại từ đơn hàng.
    return dealer.creditOpening();
  }

  /**
   * Phần trăm chiết khấu theo bậc, chỉ để HIỂN THỊ.
   *
   * <p>SAP B1 không có khái niệm này: chiết khấu đã nằm sẵn trong bảng giá, giá trả ra
   * là giá cuối. Nên mặc định trả 0 — giao diện nên ẩn dòng "chiết khấu" khi bằng 0,
   * thay vì hiện "0%" gây hiểu nhầm là đại lý không được ưu đãi.
   *
   * <p>Nếu BQ vẫn muốn hiện đúng con số như bản demo, khai báo:
   * {@code SAPB1_TIER_DISCOUNTS=Đồng:0,Bạc:0.03,Vàng:0.05,Kim Cương:0.08}
   */
  @Override
  public double tierDiscount(Dealer dealer) {
    String raw = System.getenv().getOrDefault("SAPB1_TIER_DISCOUNTS", "");
    if (raw.isBlank()) {
      return 0.0;
    }
    for (var pair : raw.split(",")) {
      var kv = pair.split(":", 2);
      if (kv.length == 2 && kv[0].trim().equals(dealer.tier())) {
        return Double.parseDouble(kv[1].trim());
      }
    }
    return 0.0;
  }

  @Override
  public Optional<Dealer> update(String code, Dealer patch) {
    // Chỉ mở cho trường liên lạc. Hạn mức công nợ là quyết định của kế toán → sửa
    // trong B1, không sửa từ app bán hàng.
    if (patch.creditLimit() != 0) {
      throw new ErpOwnedException(
          "Hạn mức công nợ do SAP B1/kế toán làm chủ — sửa trong ERP, không từ app.");
    }
    var body = new LinkedHashMap<String, Object>();
    if (patch.phone() != null) body.put("Phone1", patch.phone());
    if (patch.email() != null) body.put("EmailAddress", patch.email());
    if (patch.owner() != null) body.put("ContactPerson", patch.owner());
    if (patch.invoiceAddress() != null) body.put("Address", patch.invoiceAddress());
    if (!body.isEmpty()) {
      client.patch("/BusinessPartners('" + code + "')", body);
    }
    return get(code);
  }

  @Override
  public Dealer create(Dealer dealer) {
    var bp = client.post("/BusinessPartners", java.util.Map.of(
        "CardCode", dealer.code(),
        "CardName", dealer.name(),
        "CardType", "cCustomer"));
    return SapB1Mapping.businessPartnerToDealer(bp);
  }
}

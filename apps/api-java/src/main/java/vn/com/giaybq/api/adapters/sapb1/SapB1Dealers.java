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
import vn.com.giaybq.api.ports.NeedsMappingException;

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

  @Override
  public double tierDiscount(Dealer dealer) {
    throw new NeedsMappingException(
        "B1 không có 'chiết khấu theo bậc' như demo — giá đã nằm sẵn trong bảng giá/"
            + "SpecialPrices. Cần chốt có hiển thị % chiết khấu cho đại lý hay không.");
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

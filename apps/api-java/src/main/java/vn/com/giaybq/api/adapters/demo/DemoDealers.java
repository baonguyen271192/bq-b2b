package vn.com.giaybq.api.adapters.demo;

import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.ports.DealerPort;
import vn.com.giaybq.api.ports.OrderPort;

/** Đại lý từ dữ liệu mẫu; công nợ tính động từ đơn chưa thanh toán. */
@Component
@ConditionalOnProperty(name = "bq.data-source", havingValue = "demo", matchIfMissing = true)
class DemoDealers implements DealerPort {

  private final DemoData data;
  private final OrderPort orders;

  // @Lazy cắt vòng phụ thuộc: công nợ cần đọc đơn, mà đơn lại thuộc port khác.
  DemoDealers(DemoData data, @Lazy OrderPort orders) {
    this.data = data;
    this.orders = orders;
  }

  @Override
  public List<Dealer> all() {
    return List.copyOf(data.dealers().values());
  }

  @Override
  public Optional<Dealer> get(String code) {
    return Optional.ofNullable(data.dealers().get(code.toUpperCase()));
  }

  @Override
  public long creditUsed(Dealer dealer) {
    return dealer.creditOpening() + orders.outstandingCredit(dealer.code());
  }

  @Override
  public double tierDiscount(Dealer dealer) {
    return data.tierDiscount(dealer.tier());
  }

  @Override
  public Optional<Dealer> update(String code, Dealer patch) {
    return get(code).map(existing -> {
      var merged = existing.withProfile(
          patch.tier(),
          patch.creditLimit() != 0 ? patch.creditLimit() : null,
          patch.owner(), patch.phone(), patch.email(), patch.invoiceAddress());
      data.dealers().put(existing.code(), merged);
      return merged;
    });
  }

  @Override
  public Dealer create(Dealer dealer) {
    data.dealers().put(dealer.code(), dealer);
    return dealer;
  }
}

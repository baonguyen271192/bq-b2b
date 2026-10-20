package vn.com.giaybq.api.web;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.com.giaybq.api.domain.CreditDetail;
import vn.com.giaybq.api.domain.Dealer;
import vn.com.giaybq.api.domain.DealerView;
import vn.com.giaybq.api.ports.DealerPort;
import vn.com.giaybq.api.ports.OrderPort;

/** Đại lý + chi tiết công nợ. */
@RestController
@RequestMapping("/api/dealers")
class DealerController {

  private final DealerPort dealers;
  private final OrderPort orders;

  DealerController(DealerPort dealers, OrderPort orders) {
    this.dealers = dealers;
    this.orders = orders;
  }

  @GetMapping
  List<DealerView> list() {
    return dealers.all().stream().map(this::view).toList();
  }

  @GetMapping("/{code}")
  DealerView get(@PathVariable String code) {
    return view(require(code));
  }

  /** Chi tiết công nợ: hạn mức + hoá đơn (từ đơn công nợ thật, không mock). */
  @GetMapping("/{code}/credit")
  CreditDetail credit(@PathVariable String code) {
    var dealer = require(code);
    long used = dealers.creditUsed(dealer);
    return new CreditDetail(
        dealer.creditLimit(),
        used,
        dealer.creditLimit() - used,
        orders.creditOrders(dealer.code()),
        orders.listPayments(dealer.code()));
  }

  private Dealer require(String code) {
    return dealers.get(code)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "Đại lý không tồn tại"));
  }

  private DealerView view(Dealer dealer) {
    return DealerView.of(dealer, dealers.creditUsed(dealer));
  }
}

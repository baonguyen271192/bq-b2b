package vn.com.giaybq.api.ports;

import java.util.List;
import java.util.Optional;
import vn.com.giaybq.api.domain.Dealer;

/** Hợp đồng đại lý: hồ sơ + hạn mức công nợ. */
public interface DealerPort {

  List<Dealer> all();

  Optional<Dealer> get(String code);

  /**
   * Công nợ đã dùng.
   *
   * <p>Demo: công nợ đầu kỳ + tổng đơn công nợ chưa trả. SAP B1:
   * {@code CurrentAccountBalance} của BusinessPartner là số CHUẨN — ERP là nguồn sự
   * thật, không tự cộng lại từ đơn hàng.
   */
  long creditUsed(Dealer dealer);

  /** Chiết khấu theo bậc, 0..1 (0.05 = 5%). B1 không có khái niệm này. */
  double tierDiscount(Dealer dealer);

  Optional<Dealer> update(String code, Dealer patch);

  Dealer create(Dealer dealer);
}

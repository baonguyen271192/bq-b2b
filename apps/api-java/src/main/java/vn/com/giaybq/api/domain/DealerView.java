package vn.com.giaybq.api.domain;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/**
 * Đại lý kèm công nợ đã tính — đúng hình dạng mà API trả về.
 *
 * <p>Tách khỏi {@link Dealer} có chủ đích: {@code creditUsed} là số TÍNH RA (demo cộng
 * từ đơn chưa trả; SAP B1 đọc {@code CurrentAccountBalance}), không phải thuộc tính
 * lưu trữ. Trộn chung hai thứ là nguồn gốc của bug "số công nợ cũ".
 */
public record DealerView(
    @JsonUnwrapped Dealer dealer,
    long creditUsed,
    long creditAvailable
) {
  public static DealerView of(Dealer dealer, long creditUsed) {
    return new DealerView(dealer, creditUsed, dealer.creditLimit() - creditUsed);
  }
}

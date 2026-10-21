package vn.com.giaybq.api.service;

import java.util.List;

/**
 * Vòng đời đơn LẺ — nguồn sự thật DUY NHẤT.
 *
 * <p>Đặt ở backend thay vì rải trong admin/bot: trước đây chuỗi này tồn tại hai nơi
 * (service Commerce và map nhãn nút ở frontend BQ), sửa một bên là lệch.
 *
 * <p>Không có bước duyệt như đơn sỉ — đơn lẻ thu tiền trước hoặc COD, không dính hạn
 * mức công nợ.
 */
public final class RetailLifecycle {

  /** Theo đúng thứ tự. Bước cuối không đẩy tiếp được. */
  public static final List<String> FLOW =
      List.of("Chờ xác nhận", "Đang đóng gói", "Đang giao", "Hoàn tất");

  public static final String FIRST = FLOW.get(0);
  public static final String CANCELLED = "Đã huỷ";
  public static final String REFUND_DUE = "cần hoàn tiền";
  public static final String PAID = "đã thanh toán";

  private RetailLifecycle() {}

  /** Trạng thái kế tiếp, rỗng nếu đang ở bước cuối hoặc trạng thái ngoài vòng đời. */
  public static java.util.Optional<String> next(String current) {
    int i = FLOW.indexOf(current);
    if (i < 0 || i >= FLOW.size() - 1) {
      return java.util.Optional.empty();
    }
    return java.util.Optional.of(FLOW.get(i + 1));
  }
}

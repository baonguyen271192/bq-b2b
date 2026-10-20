package vn.com.giaybq.api.ports;

/**
 * Thao tác bị từ chối vì dữ liệu do ERP làm chủ (tồn kho, danh mục, hạn mức).
 *
 * <p>Dịch thành HTTP 409 — xem {@code web/ApiExceptionHandler}. Không bao giờ "âm
 * thầm bỏ qua": frontend cần biết thao tác KHÔNG xảy ra.
 */
public class ErpOwnedException extends RuntimeException {
  public ErpOwnedException(String message) {
    super(message);
  }
}

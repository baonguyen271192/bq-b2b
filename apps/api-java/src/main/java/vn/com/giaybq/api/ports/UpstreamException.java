package vn.com.giaybq.api.ports;

/**
 * Hệ thống dữ liệu thượng nguồn trả lỗi (hiện tại: SAP B1 Service Layer).
 *
 * <p>Tồn tại để tầng web KHÔNG phải biết adapter nào đang chạy: handler chỉ bắt kiểu
 * này, còn adapter cụ thể thì kế thừa nó. Dịch thành HTTP 502 — lỗi đến từ thượng
 * nguồn, không phải lỗi của client.
 */
public class UpstreamException extends RuntimeException {

  private final int upstreamStatus;

  public UpstreamException(String message, int upstreamStatus) {
    super(message);
    this.upstreamStatus = upstreamStatus;
  }

  public int upstreamStatus() {
    return upstreamStatus;
  }
}

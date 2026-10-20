package vn.com.giaybq.api.adapters.sapb1;

import vn.com.giaybq.api.ports.UpstreamException;

/**
 * Service Layer trả lỗi. Giữ nguyên payload vì B1 báo lỗi rất chi tiết.
 *
 * <p>Kế thừa {@link UpstreamException} để tầng web bắt được mà không phải import gói
 * adapter này — xem ranh giới 4.1 trong docs/architecture.md.
 */
public class ServiceLayerException extends UpstreamException {

  public ServiceLayerException(int status, String payload) {
    super("SAP B1 Service Layer " + status + ": " + payload, status);
  }

  /** Mã HTTP mà Service Layer trả về (401 = phiên hết hạn). */
  public int status() {
    return upstreamStatus();
  }
}

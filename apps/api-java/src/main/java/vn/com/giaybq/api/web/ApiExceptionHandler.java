package vn.com.giaybq.api.web;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import vn.com.giaybq.api.ports.ErpOwnedException;
import vn.com.giaybq.api.ports.NeedsMappingException;
import vn.com.giaybq.api.ports.UpstreamException;
import vn.com.giaybq.api.service.OrderService;

/**
 * Dịch lỗi tầng adapter/nghiệp vụ sang HTTP có nghĩa.
 *
 * <p>Giữ đúng mã lỗi của bản Python để frontend không phải sửa: 409 khi ERP làm chủ
 * dữ liệu, 501 khi chưa ánh xạ sang SAP B1, 400 cho đơn không hợp lệ.
 */
@RestControllerAdvice
class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  /** Dùng khoá "detail" cho khớp định dạng lỗi của FastAPI mà frontend đang đọc. */
  private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
    return ResponseEntity.status(status).body(Map.of("detail", message));
  }

  @ExceptionHandler(ErpOwnedException.class)
  ResponseEntity<Map<String, String>> erpOwned(ErpOwnedException e) {
    return error(HttpStatus.CONFLICT, e.getMessage());
  }

  @ExceptionHandler(NeedsMappingException.class)
  ResponseEntity<Map<String, String>> needsMapping(NeedsMappingException e) {
    log.warn("Chưa ánh xạ sang SAP B1: {}", e.getMessage());
    return error(HttpStatus.NOT_IMPLEMENTED, "Chưa ánh xạ sang SAP B1: " + e.getMessage());
  }

  /**
   * Lỗi từ hệ thống dữ liệu thượng nguồn. Bắt kiểu chung {@link UpstreamException}
   * chứ không bắt kiểu của adapter cụ thể — tầng web không được biết đang chạy
   * adapter nào (ranh giới 4.1, docs/architecture.md).
   */
  @ExceptionHandler(UpstreamException.class)
  ResponseEntity<Map<String, String>> upstream(UpstreamException e) {
    log.error("Hệ thống dữ liệu thượng nguồn lỗi (status={})", e.upstreamStatus(), e);
    // 502: lỗi đến từ thượng nguồn, không phải lỗi của client.
    return error(HttpStatus.BAD_GATEWAY, e.getMessage());
  }

  @ExceptionHandler(OrderService.UnknownProductException.class)
  ResponseEntity<Map<String, String>> unknownProduct(OrderService.UnknownProductException e) {
    return error(HttpStatus.BAD_REQUEST, e.getMessage());
  }

  @ExceptionHandler(OrderService.EmptyOrderException.class)
  ResponseEntity<Map<String, String>> emptyOrder(OrderService.EmptyOrderException e) {
    return error(HttpStatus.BAD_REQUEST, e.getMessage());
  }
}

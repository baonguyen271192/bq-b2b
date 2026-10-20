package vn.com.giaybq.api.ports;

/**
 * Chỗ cần biết cấu hình SAP B1 thật của BQ mới viết tiếp được.
 *
 * <p>Cố ý ném lỗi thay vì đoán: một ánh xạ sai (nhất là bảng size) sẽ ghi SAI SỐ
 * LƯỢNG vào ERP thật — hỏng dữ liệu còn tệ hơn lỗi lộ ra ngay. Dịch thành HTTP 501.
 */
public class NeedsMappingException extends RuntimeException {
  public NeedsMappingException(String message) {
    super(message);
  }
}

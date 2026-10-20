package vn.com.giaybq.api.adapters.sapb1;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import vn.com.giaybq.api.ports.NeedsMappingException;

/**
 * Ánh xạ trạng thái đơn giữa BQ và SAP B1.
 *
 * <p>BQ xác nhận B1 của họ ĐÃ có đủ 5 trạng thái. B1 chuẩn chỉ có Open/Closed/Cancelled
 * trên {@code ORDR.DocStatus}, nên 5 trạng thái đó gần như chắc chắn nằm trong một
 * trường tuỳ biến (UDF, thường tên {@code U_...}). Lớp này đọc TÊN TRƯỜNG và BẢNG GIÁ
 * TRỊ từ cấu hình, nên khi BQ cho biết tên thật thì chỉ cần đổi biến môi trường:
 *
 * <pre>
 * SAPB1_ORDER_STATUS_FIELD=U_BQ_Status
 * SAPB1_ORDER_STATUS_VALUES=1:Chờ xác nhận,2:Đã xác nhận,3:Đang đóng gói,4:Đang bàn giao vận chuyển,5:Đại lý đã nhận
 * </pre>
 *
 * <p>Nếu B1 lưu thẳng chuỗi tiếng Việt thì bảng giá trị dùng dạng đồng nhất
 * ({@code Chờ xác nhận:Chờ xác nhận,...}), hoặc bỏ trống để dùng nguyên giá trị thô.
 */
final class OrderStatusMapping {

  private final String field;
  /** giá trị trong B1 -> nhãn của BQ */
  private final Map<String, String> toBq;
  /** nhãn của BQ -> giá trị trong B1 */
  private final Map<String, String> toB1;

  private OrderStatusMapping(String field, Map<String, String> toBq, Map<String, String> toB1) {
    this.field = field;
    this.toBq = toBq;
    this.toB1 = toB1;
  }

  static OrderStatusMapping fromConfig(String field, String values) {
    var toBq = new LinkedHashMap<String, String>();
    var toB1 = new LinkedHashMap<String, String>();
    if (values != null && !values.isBlank()) {
      for (var pair : values.split(",")) {
        var kv = pair.split(":", 2);
        if (kv.length == 2) {
          String b1 = kv[0].trim();
          String bq = kv[1].trim();
          toBq.put(b1, bq);
          toB1.put(bq, b1);
        }
      }
    }
    return new OrderStatusMapping(field == null ? "" : field.trim(), toBq, toB1);
  }

  boolean isConfigured() {
    return !field.isEmpty();
  }

  /** Tên trường UDF trên Orders, dùng cho cả {@code $select} lẫn PATCH. */
  String field() {
    requireConfigured();
    return field;
  }

  /** Giá trị thô từ B1 -> nhãn BQ. Không có trong bảng thì trả nguyên giá trị. */
  String toBqLabel(String rawValue) {
    if (rawValue == null || rawValue.isBlank()) {
      return "";
    }
    return toBq.getOrDefault(rawValue, rawValue);
  }

  /** Nhãn BQ -> giá trị ghi vào B1. */
  Optional<String> toB1Value(String bqLabel) {
    if (toB1.isEmpty()) {
      return Optional.of(bqLabel);   // bảng trống = B1 lưu thẳng chuỗi của BQ
    }
    return Optional.ofNullable(toB1.get(bqLabel));
  }

  private void requireConfigured() {
    if (!isConfigured()) {
      throw new NeedsMappingException(
          "BQ cho biết SAP B1 đã có đủ 5 trạng thái đơn, nhưng chưa biết CHÚNG NẰM Ở "
              + "TRƯỜNG NÀO. Đặt SAPB1_ORDER_STATUS_FIELD (vd U_BQ_Status) và "
              + "SAPB1_ORDER_STATUS_VALUES (vd '1:Chờ xác nhận,2:Đã xác nhận,...'). "
              + "Xem docs/sap-b1-mapping-proposal.md phần B1.");
    }
  }
}

package vn.com.giaybq.api.adapters.sapb1;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Cache có hạn dùng, rất nhỏ, cho các lần đọc danh mục từ SAP B1.
 *
 * <p>Vì sao cần: adapter demo đọc bộ nhớ nên gọi bao nhiêu lần cũng rẻ, còn adapter B1
 * thì MỖI lần là một request mạng. {@code /api/admin/analytics} duyệt toàn bộ danh mục
 * để tìm hàng sắp hết, trợ lý AI cũng đọc danh mục mỗi câu hỏi — với 258 mẫu × nhiều
 * size là hàng nghìn dòng {@code OITM} mỗi lần. Không cache thì không dùng được.
 *
 * <p>Vì sao tự viết thay vì dùng Caffeine/Spring Cache: cần đúng một hành vi (nhớ theo
 * khoá, hết hạn theo thời gian), và code này sẽ được team IT của BQ bảo trì — ít phụ
 * thuộc hơn thì dễ đọc hơn.
 *
 * <p><b>Chỉ cache dữ liệu đọc-nhiều-đổi-ít.</b> Tuyệt đối KHÔNG cache công nợ, số dư
 * hay tồn kho tại thời điểm chốt đơn: đó là tiền và là hàng, phải đọc tươi từ ERP.
 */
final class TtlCache {

  private record Entry(Object value, Instant expiresAt) {}

  private final Map<String, Entry> entries = new ConcurrentHashMap<>();
  private final Duration ttl;

  TtlCache(Duration ttl) {
    this.ttl = ttl;
  }

  /** Trả giá trị còn hạn, hoặc gọi {@code loader} rồi nhớ lại. */
  @SuppressWarnings("unchecked")
  <T> T get(String key, Supplier<T> loader) {
    if (ttl.isZero() || ttl.isNegative()) {
      return loader.get();   // ttl <= 0 = tắt cache, tiện khi cần soi lỗi dữ liệu
    }
    var now = Instant.now();
    var hit = entries.get(key);
    if (hit != null && hit.expiresAt().isAfter(now)) {
      return (T) hit.value();
    }
    // Cố ý KHÔNG khoá: hai request cùng lúc có thể cùng nạp một lần. Đổi lại là
    // không bao giờ chặn nhau. Đọc danh mục là thao tác đọc thuần, nạp hai lần vô hại.
    T value = loader.get();
    entries.put(key, new Entry(value, now.plus(ttl)));
    return value;
  }

  /** Xoá toàn bộ — gọi sau khi ghi thứ gì đó làm danh mục đổi. */
  void invalidateAll() {
    entries.clear();
  }
}

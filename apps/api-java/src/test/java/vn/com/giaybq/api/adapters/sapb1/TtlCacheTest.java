package vn.com.giaybq.api.adapters.sapb1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Cache này đứng giữa app và SAP B1, nên hành vi sai của nó biểu hiện thành "số liệu
 * cũ" — loại lỗi khó phát hiện nhất khi chạy thật. Vì vậy test kỹ ngay từ đầu.
 */
class TtlCacheTest {

  @Test
  @DisplayName("Lần gọi thứ hai trong hạn không gọi lại nguồn")
  void servesFromCacheWithinTtl() {
    var cache = new TtlCache(Duration.ofMinutes(5));
    var loads = new AtomicInteger();

    String first = cache.get("k", () -> "giá-trị-" + loads.incrementAndGet());
    String second = cache.get("k", () -> "giá-trị-" + loads.incrementAndGet());

    assertThat(first).isEqualTo("giá-trị-1");
    assertThat(second).isEqualTo("giá-trị-1");
    assertThat(loads).hasValue(1);
  }

  @Test
  @DisplayName("Khoá khác nhau được nhớ riêng (lọc theo nhóm hàng là truy vấn khác)")
  void keysAreIndependent() {
    var cache = new TtlCache(Duration.ofMinutes(5));
    var loads = new AtomicInteger();

    cache.get("products:*", loads::incrementAndGet);
    cache.get("products:Giày Nam", loads::incrementAndGet);
    cache.get("products:*", loads::incrementAndGet);

    assertThat(loads).hasValue(2);
  }

  @Test
  @DisplayName("Hết hạn thì đọc lại nguồn")
  void reloadsAfterExpiry() throws InterruptedException {
    var cache = new TtlCache(Duration.ofMillis(40));
    var loads = new AtomicInteger();

    cache.get("k", loads::incrementAndGet);
    Thread.sleep(80);
    cache.get("k", loads::incrementAndGet);

    assertThat(loads).hasValue(2);
  }

  @Test
  @DisplayName("TTL = 0 tắt hẳn cache (dùng khi cần soi lỗi dữ liệu)")
  void zeroTtlDisablesCaching() {
    var cache = new TtlCache(Duration.ZERO);
    var loads = new AtomicInteger();

    cache.get("k", loads::incrementAndGet);
    cache.get("k", loads::incrementAndGet);
    cache.get("k", loads::incrementAndGet);

    assertThat(loads).hasValue(3);
  }

  @Test
  @DisplayName("invalidateAll buộc đọc lại")
  void invalidateForcesReload() {
    var cache = new TtlCache(Duration.ofMinutes(5));
    var loads = new AtomicInteger();

    cache.get("k", loads::incrementAndGet);
    cache.invalidateAll();
    cache.get("k", loads::incrementAndGet);

    assertThat(loads).hasValue(2);
  }

  @Test
  @DisplayName("Nhớ được cả giá trị null-an-toàn và kiểu tham số hoá")
  void keepsTypedValues() {
    var cache = new TtlCache(Duration.ofMinutes(5));

    java.util.List<String> value = cache.get("list", () -> java.util.List.of("a", "b"));
    java.util.List<String> again = cache.get("list", () -> java.util.List.of("khác"));

    assertThat(again).isSameAs(value).containsExactly("a", "b");
  }
}

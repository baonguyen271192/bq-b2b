package vn.com.giaybq.api.domain;

import java.util.List;
import java.util.Map;

public record Analytics(
    long gmvTotal,
    int ordersTotal,
    Map<String, Integer> byStatus,
    Map<String, Integer> byChannel,
    List<TopProduct> topProducts,
    List<LowStock> lowStock,
    long totalOutstanding,
    List<Aging> aging,
    List<AgingBucket> agingBuckets
) {
  public record TopProduct(String name, int pairs) {}

  public record LowStock(String code, String name, String size, int stock) {}

  public record Aging(String code, String name, long outstanding) {}

  public record AgingBucket(String label, long amount, int count) {}
}

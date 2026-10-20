package vn.com.giaybq.api.domain;

import java.util.Map;

public record OrderItem(
    String code,
    String name,
    Map<String, Integer> sizes,
    long unitPrice,
    int qtyTotal,
    long lineTotal
) {}

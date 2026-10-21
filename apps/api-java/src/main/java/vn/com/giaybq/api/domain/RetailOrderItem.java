package vn.com.giaybq.api.domain;

import java.util.Map;

/**
 * Một mã hàng trong đơn LẺ.
 *
 * @param sizes số đôi theo từng size, vd {@code {"39": 2, "40": 1}}. Giữ nguyên hình
 *              dạng của đơn sỉ để admin dùng chung component hiển thị.
 */
public record RetailOrderItem(
    String code,
    String name,
    Map<String, Integer> sizes,
    long unitPrice,
    int qtyTotal,
    long lineTotal
) {}

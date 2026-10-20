package vn.com.giaybq.api.domain;

import java.util.List;

public record CreditDetail(
    long creditLimit,
    long creditUsed,
    long creditAvailable,
    List<Order> invoices,
    List<Payment> transactions
) {}

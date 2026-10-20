package vn.com.giaybq.api.domain;

public record Payment(
    String id,
    String dealerCode,
    String orderId,
    long amount,
    String method,
    String createdAt
) {}

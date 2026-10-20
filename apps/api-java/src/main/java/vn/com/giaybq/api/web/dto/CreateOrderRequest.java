package vn.com.giaybq.api.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.Map;

/**
 * Body của {@code POST /api/orders}. Khoá JSON là snake_case ({@code dealer_code}) —
 * Jackson đã cấu hình SNAKE_CASE toàn cục.
 */
public record CreateOrderRequest(
    @NotBlank String dealerCode,
    @NotEmpty @Valid List<Line> lines,
    String delivery,
    String payment,
    String channel
) {
  public record Line(@NotBlank String code, @NotEmpty Map<String, Integer> sizes) {}

  public String deliveryOrDefault() {
    return delivery == null || delivery.isBlank() ? "Kho HCM" : delivery;
  }

  public String paymentOrDefault() {
    return payment == null || payment.isBlank() ? "Công nợ" : payment;
  }

  /** 'app' | 'web' | 'ai-chat' */
  public String channelOrDefault() {
    return channel == null || channel.isBlank() ? "app" : channel;
  }
}

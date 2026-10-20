package vn.com.giaybq.api.web;

import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.config.HttpClients;
import vn.com.giaybq.api.web.dto.Requests;

/**
 * Trợ lý AI — hiện PROXY sang service Python ({@code apps/api}).
 *
 * <p>Vì sao chưa viết lại bằng Java: khối này là ~1.000 dòng xử lý tiếng Việt (bỏ dấu,
 * nhận diện ý định, phân tích hội thoại đặt đơn) cộng hai client LLM. Port sang Java
 * tốn nhiều công mà không đổi lại được gì về vận hành — trong khi phần lõi giao dịch
 * (đơn, công nợ, ERP) thì Java hơn hẳn. Xem docs/architecture.md §8.
 *
 * <p>Hợp đồng API giữ nguyên: frontend và mobile vẫn gọi đúng hai đường dẫn này.
 */
@RestController
@RequestMapping("/api/assistant")
class AssistantController {

  private static final Logger log = LoggerFactory.getLogger(AssistantController.class);

  private final RestClient http;

  AssistantController(BqProperties props, HttpClients.RestClientFactory clients,
                      @Value("${server.port}") int ownPort) {
    String target = props.assistant().baseUrl();
    // Trỏ trợ lý về chính cổng của mình = proxy gọi lại chính nó và treo request.
    // Chặn ngay lúc khởi động thay vì để phát hiện bằng một request bị đơ.
    if (target.endsWith(":" + ownPort)) {
      throw new IllegalStateException(
          "bq.assistant.base-url (" + target + ") trùng cổng của chính API ("
              + ownPort + "). Chạy service trợ lý Python ở cổng khác.");
    }
    this.http = clients.create(target);
  }

  @PostMapping
  JsonNode dealerAssistant(@Valid @RequestBody Requests.AssistantBody body) {
    return forward("/api/assistant",
        Map.of("dealer_code", body.dealerCode(), "question", body.question()));
  }

  @PostMapping("/sale")
  JsonNode saleAssistant(@Valid @RequestBody Requests.SaleAssistantBody body) {
    return forward("/api/assistant/sale", Map.of("question", body.question()));
  }

  /**
   * Chuyển tiếp sang service Python.
   *
   * <p>Body dựng bằng Map với khoá snake_case VIẾT TƯỜNG MINH, không serialize record.
   * Lý do: {@code RestClient.builder()} tĩnh không mang theo cấu hình Jackson của Spring
   * Boot (SNAKE_CASE), nên record sẽ đi ra thành {@code dealerCode} và FastAPI từ chối
   * bằng 422. Viết tường minh cũng làm hợp đồng giữa hai service nhìn thấy được ngay
   * tại chỗ gọi, thay vì ẩn trong cấu hình toàn cục.
   */
  private JsonNode forward(String path, Map<String, Object> body) {
    try {
      return http.post()
          .uri(path)
          .contentType(MediaType.APPLICATION_JSON)
          .body(body)
          .retrieve()
          .body(JsonNode.class);
    } catch (RuntimeException e) {
      // Trợ lý hỏng KHÔNG được làm sập luồng đặt đơn — báo 503 để FE hiển thị
      // "trợ lý tạm nghỉ" thay vì màn hình lỗi.
      log.warn("Proxy trợ lý thất bại ({}): {}", path, e.toString());
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Trợ lý AI không phản hồi (service Python). Chi tiết: " + e.getMessage(), e);
    }
  }
}

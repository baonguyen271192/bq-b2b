package vn.com.giaybq.api.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * Hợp đồng OpenAPI sinh ra phải MÔ TẢ ĐÚNG những gì API thật trả về.
 *
 * <p>Có test này vì đã dính đúng lỗi đó một lần: springdoc chạy trên Jackson 2 với
 * ObjectMapper riêng, không thấy {@code spring.jackson.property-naming-strategy} của
 * Jackson 3, nên sinh ra {@code dealerCode} trong khi API trả {@code dealer_code}.
 * Hợp đồng sai còn nguy hiểm hơn không có hợp đồng: frontend và mobile sinh kiểu dữ
 * liệu từ nó rồi hỏng âm thầm.
 *
 * <p>Xem {@code config/OpenApiConfig#snakeCaseModelResolver}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OpenApiContractTest {

  @Value("${local.server.port}")
  int port;

  private RestClient client() {
    return RestClient.builder().baseUrl("http://127.0.0.1:" + port).build();
  }

  private JsonNode spec() {
    return client().get().uri("/openapi.json").retrieve().body(JsonNode.class);
  }

  @Test
  @DisplayName("Spec phục vụ được và có đủ các đường dẫn chính")
  void specIsServed() {
    var paths = spec().path("paths");

    assertThat(paths.propertyNames()).contains(
        "/api/dealers", "/api/dealers/{code}/credit", "/api/products", "/api/orders",
        "/api/admin/analytics", "/api/assistant");
  }

  @Test
  @DisplayName("MỌI tên trường trong schema phải là snake_case, khớp JSON thật")
  void allSchemaPropertiesAreSnakeCase() {
    var schemas = spec().path("components").path("schemas");
    var camelCase = new ArrayList<String>();

    for (String schemaName : schemas.propertyNames()) {
      var properties = schemas.path(schemaName).path("properties");
      for (String property : properties.propertyNames()) {
        if (!property.equals(property.toLowerCase()) || property.contains("-")) {
          camelCase.add(schemaName + "." + property);
        }
      }
    }

    assertThat(camelCase)
        .as("Trường viết camelCase = spec không khớp API thật. "
            + "Kiểm tra bean snakeCaseModelResolver trong OpenApiConfig.")
        .isEmpty();
  }

  @Test
  @DisplayName("Schema Order mô tả đúng các trường mà /api/orders trả về")
  void orderSchemaMatchesRuntime() {
    List<String> declared =
        spec().path("components").path("schemas").path("Order").path("properties")
            .propertyNames().stream().toList();

    var orders = client().get().uri("/api/orders").retrieve().body(JsonNode.class);
    assertThat(orders).as("cần ít nhất một đơn demo để đối chiếu").isNotEmpty();

    List<String> actual = orders.get(0).propertyNames().stream().toList();

    // Spec có thể khai nhiều hơn (trường nullable bị lược khỏi JSON khi null),
    // nhưng KHÔNG được thiếu trường nào runtime thật sự trả về.
    assertThat(declared).containsAll(actual);
  }

  @Test
  @DisplayName("Schema DealerView mô tả đúng các trường của /api/dealers")
  void dealerSchemaMatchesRuntime() {
    List<String> declared =
        spec().path("components").path("schemas").path("DealerView").path("properties")
            .propertyNames().stream().toList();

    var dealers = client().get().uri("/api/dealers").retrieve().body(JsonNode.class);
    List<String> actual = dealers.get(0).propertyNames().stream().toList();

    assertThat(declared).containsAll(actual);
    assertThat(declared).contains("credit_used", "credit_available", "credit_limit");
  }
}

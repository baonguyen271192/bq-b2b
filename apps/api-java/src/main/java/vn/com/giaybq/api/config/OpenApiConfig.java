package vn.com.giaybq.api.config;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.core.util.Json;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Đặc tả OpenAPI sinh từ chính code này.
 *
 * <p>Đây là NGUỒN SINH hợp đồng API ({@code packages/contracts/openapi.json}) mà
 * {@code apps/web} và {@code apps/mobile} dựa vào. Trước đây hợp đồng kéo từ service
 * FastAPI; khi Python thu lại chỉ còn làm trợ lý AI thì nguồn đó biến mất, nên nó
 * phải nằm ở đây.
 *
 * <p>Cập nhật hợp đồng sau khi đổi API: {@code pnpm contracts:pull}.
 */
@Configuration
class OpenApiConfig {

  /**
   * Bắt springdoc sinh tên trường theo snake_case, khớp với JSON mà API thật trả về.
   *
   * <p>Không có bean này thì spec sinh ra <b>nói dối</b>: nó ghi {@code dealerCode}
   * trong khi API trả {@code dealer_code}. Hợp đồng sai còn tệ hơn không có hợp đồng —
   * frontend/mobile sinh kiểu dữ liệu từ nó sẽ hỏng âm thầm.
   *
   * <p>Nguyên nhân: swagger-core chạy trên <b>Jackson 2</b>
   * ({@code com.fasterxml.jackson}) với ObjectMapper riêng, tách hẳn khỏi
   * <b>Jackson 3</b> ({@code tools.jackson}) mà Spring Boot 4 dùng — nên nó không
   * nhìn thấy {@code spring.jackson.property-naming-strategy}. Phải cấu hình riêng.
   *
   * <p>Dùng {@code copy()} thay vì sửa thẳng {@link Json#mapper()} vì mapper đó là
   * singleton dùng chung toàn JVM.
   */
  @Bean
  ModelResolver snakeCaseModelResolver() {
    var swaggerMapper = Json.mapper().copy()
        .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    return new ModelResolver(swaggerMapper);
  }

  @Bean
  OpenAPI bqOpenApi(BqProperties props) {
    return new OpenAPI().info(new Info()
        .title("BQ B2B — API đặt đơn sỉ đại lý")
        .version("0.1.0")
        .description("""
            Nghiệp vụ bán sỉ B2B của Giày BQ: danh mục theo bậc giá, đặt đơn theo bảng \
            size, hạn mức công nợ, vòng đời đơn, và trợ lý AI cho đại lý lẫn sale.

            **Nguồn dữ liệu đang chạy: `%s`.** Đổi bằng biến môi trường \
            `BQ_DATA_SOURCE` (`demo` hoặc `sapb1`) — hợp đồng API không đổi theo \
            nguồn dữ liệu, đó là mục đích của tầng ports/adapters.

            Hai đường dẫn `/api/assistant*` được chuyển tiếp sang service trợ lý \
            (Python/FastAPI); xem `docs/architecture.md` §8.
            """.formatted(props.dataSource()))
        .contact(new Contact().name("Giày BQ").url("https://giaybq.com.vn"))
        .license(new License().name("Proprietary")));
  }
}

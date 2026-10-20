package vn.com.giaybq.api.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/**
 * Factory tạo {@link RestClient} cho các lời gọi ra ngoài (service trợ lý Python, SAP
 * B1 Service Layer).
 *
 * <p>File này tồn tại vì hai cái bẫy của Spring Boot 4, cả hai đều biểu hiện ra ngoài
 * dưới dạng "upstream bảo thiếu body" chứ không phải lỗi ở đây:
 *
 * <ol>
 *   <li>Boot 4 KHÔNG auto-configure bean {@code RestClient.Builder}, và
 *       {@code RestClient.builder()} tĩnh không có message converter JSON nào.
 *   <li>JDK HttpClient mặc định thử nâng cấp lên <b>HTTP/2 cleartext</b>
 *       ({@code Upgrade: h2c}) và gửi body dạng {@code Transfer-Encoding: chunked}.
 *       Server HTTP/1.1 (uvicorn, và nhiều bản cài SAP B1 Service Layer) làm MẤT body
 *       trong tổ hợp đó — request tới nơi với body rỗng.
 * </ol>
 *
 * <p>Nên: ép HTTP/1.1 và gắn converter dùng chính JsonMapper của Spring để cấu hình
 * (SNAKE_CASE...) áp dụng đồng nhất cả chiều vào lẫn chiều ra.
 */
@Configuration
public class HttpClients {

  private final JsonMapper mapper;

  // Jackson 3: bean Boot 4 cấp là JsonMapper (lớp con của ObjectMapper), và
  // JacksonJsonHttpMessageConverter chỉ nhận đúng JsonMapper.
  HttpClients(JsonMapper mapper) {
    this.mapper = mapper;
  }

  @Bean
  public RestClientFactory restClientFactory() {
    var jdkClient = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)   // xem bẫy số 2 ở javadoc lớp
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    var requestFactory = new JdkClientHttpRequestFactory(jdkClient);
    requestFactory.setReadTimeout(Duration.ofSeconds(60));   // LLM trả lời có thể lâu

    return baseUrl -> RestClient.builder()
        .baseUrl(baseUrl)
        .requestFactory(requestFactory)
        // Thêm vào ĐẦU danh sách thay vì clear(): giữ các bộ ghi mặc định (String,
        // byte[], form) và chỉ ưu tiên Jackson cho JSON.
        .messageConverters(converters ->
            converters.add(0, new JacksonJsonHttpMessageConverter(mapper)))
        .build();
  }

  /** Tạo client theo base URL. Tách thành interface để test tiêm bản giả dễ dàng. */
  @FunctionalInterface
  public interface RestClientFactory {
    RestClient create(String baseUrl);
  }
}

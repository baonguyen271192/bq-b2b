package vn.com.giaybq.api.web;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.com.giaybq.api.config.BqProperties;

/**
 * {@code /health} giữ nguyên hình dạng của bản Python vì Render healthCheckPath và
 * các script giám sát đang trỏ vào đây. Actuator vẫn phục vụ {@code /actuator/health}
 * cho nhu cầu chi tiết hơn.
 */
@RestController
class HealthController {

  private final BqProperties props;

  HealthController(BqProperties props) {
    this.props = props;
  }

  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "ok", "data_source", props.dataSource());
  }
}

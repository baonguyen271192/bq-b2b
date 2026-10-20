package vn.com.giaybq.api.adapters.sapb1;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.config.HttpClients;

/**
 * Chỉ nạp khi {@code bq.data-source=sapb1}. Nguồn demo không tạo client nào, không
 * mở kết nối nào tới ERP.
 */
@Configuration
@ConditionalOnProperty(name = "bq.data-source", havingValue = "sapb1")
class SapB1Config {

  @Bean
  ServiceLayerClient serviceLayerClient(BqProperties props,
                                        HttpClients.RestClientFactory clients,
                                        ObjectMapper mapper) {
    var cfg = props.sapb1();
    cfg.validate();   // fail-fast lúc khởi động, không để lỗi 500 ở request đầu
    return new ServiceLayerClient(cfg, clients, mapper);
  }
}

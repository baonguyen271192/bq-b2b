package vn.com.giaybq.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * BQ B2B — API đặt đơn sỉ cho đại lý Giày BQ.
 *
 * <p>Nghiệp vụ không biết dữ liệu đến từ đâu: mọi thứ đi qua {@code ports/*}, và
 * {@code bq.data-source} chọn adapter ({@code demo} hoặc {@code sapb1}). Nhờ vậy
 * chuyển sang SAP Business One không bắt controller, frontend hay mobile sửa gì.
 *
 * <p>Hợp đồng API: {@code packages/contracts/openapi.json}.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(ApiApplication.class, args);
  }
}

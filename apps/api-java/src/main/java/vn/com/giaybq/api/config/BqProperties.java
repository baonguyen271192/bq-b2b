package vn.com.giaybq.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình chạy, bind từ tiền tố {@code bq.*} (12-factor: tất cả đến từ môi trường).
 *
 * @param dataSource "demo" hoặc "sapb1" — công tắc quan trọng nhất của backend.
 */
@ConfigurationProperties(prefix = "bq")
public record BqProperties(
    String dataSource,
    Demo demo,
    SapB1 sapb1,
    Assistant assistant,
    Cors cors
) {

  public record Demo(String ordersDb) {}

  public record SapB1(
      String baseUrl,
      String companyDb,
      String username,
      String password,
      boolean verifySsl,
      String warehouse,
      int pageSize
  ) {
    /** Fail-fast lúc khởi động thay vì để lỗi 500 mơ hồ ở request đầu tiên. */
    public void validate() {
      var missing = new java.util.ArrayList<String>();
      if (isBlank(baseUrl)) missing.add("SAPB1_BASE_URL");
      if (isBlank(companyDb)) missing.add("SAPB1_COMPANY_DB");
      if (isBlank(username)) missing.add("SAPB1_USERNAME");
      if (isBlank(password)) missing.add("SAPB1_PASSWORD");
      if (!missing.isEmpty()) {
        throw new IllegalStateException(
            "Thiếu cấu hình SAP B1: " + String.join(", ", missing) + ". Xem .env.example.");
      }
    }

    private static boolean isBlank(String s) {
      return s == null || s.isBlank();
    }
  }

  public record Assistant(String baseUrl) {}

  public record Cors(String allowedOrigins) {}
}

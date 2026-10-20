package vn.com.giaybq.api.adapters.sapb1;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import vn.com.giaybq.api.config.BqProperties;
import vn.com.giaybq.api.config.HttpClients;

/**
 * Client cho SAP B1 Service Layer (OData v4). Không chứa nghiệp vụ BQ — chỉ lo đăng
 * nhập, giữ phiên, phân trang và dịch lỗi.
 *
 * <p>[Unverified] Đường dẫn và tên trường theo tài liệu Service Layer phổ biến; PHẢI
 * đối chiếu với bản cài + Patch Level thật của BQ trước khi tin.
 */
public class ServiceLayerClient {

  private static final Logger log = LoggerFactory.getLogger(ServiceLayerClient.class);

  private final RestClient http;
  private final BqProperties.SapB1 cfg;
  private final ObjectMapper mapper;
  private final ReentrantLock loginLock = new ReentrantLock();

  private volatile String sessionCookie;

  ServiceLayerClient(BqProperties.SapB1 cfg, HttpClients.RestClientFactory clients,
                     ObjectMapper mapper) {
    this.cfg = cfg;
    this.mapper = mapper;
    this.http = clients.create(cfg.baseUrl());
  }

  // ---------- phiên làm việc ----------

  private void login() {
    loginLock.lock();
    try {
      var response = http.post()
          .uri("/Login")
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of(
              "CompanyDB", cfg.companyDb(),
              "UserName", cfg.username(),
              "Password", cfg.password()))
          .retrieve()
          .toEntity(JsonNode.class);

      var cookies = response.getHeaders().get("Set-Cookie");
      if (cookies == null || cookies.isEmpty()) {
        throw new ServiceLayerException(500, "Login thành công nhưng không nhận được B1SESSION");
      }
      // Giữ nguyên cả chuỗi cookie: Service Layer trả B1SESSION kèm ROUTEID khi chạy
      // sau load balancer — bỏ ROUTEID sẽ rơi vào node khác và mất phiên.
      sessionCookie = String.join("; ", cookies.stream().map(c -> c.split(";", 2)[0]).toList());
      log.info("SAP B1: đăng nhập thành công (companyDB={})", cfg.companyDb());
    } finally {
      loginLock.unlock();
    }
  }

  // ---------- gọi API ----------

  public JsonNode request(HttpMethod method, String path, Object body) {
    if (sessionCookie == null) {
      login();
    }
    try {
      return exchange(method, path, body);
    } catch (ServiceLayerException e) {
      if (e.status() != 401) {
        throw e;
      }
      // Phiên hết hạn (mặc định ~30 phút không hoạt động) trả 401, không phải lỗi
      // mạng. Đăng nhập lại ĐÚNG MỘT LẦN rồi thử lại, tránh lặp vô tận khi sai mật khẩu.
      log.info("SAP B1: phiên hết hạn, đăng nhập lại");
      sessionCookie = null;
      login();
      return exchange(method, path, body);
    }
  }

  private JsonNode exchange(HttpMethod method, String path, Object body) {
    var spec = http.method(method).uri(path).header("Cookie", sessionCookie);
    if (body != null) {
      spec = spec.contentType(MediaType.APPLICATION_JSON).body(body);
    }
    return spec.exchange((req, res) -> {
      if (res.getStatusCode().isError()) {
        throw new ServiceLayerException(res.getStatusCode().value(),
            new String(res.getBody().readAllBytes()));
      }
      if (res.getStatusCode().value() == 204) {
        return null;
      }
      return mapper.readTree(res.getBody());
    });
  }

  public JsonNode get(String path) {
    return request(HttpMethod.GET, path, null);
  }

  public JsonNode post(String path, Object body) {
    return request(HttpMethod.POST, path, body);
  }

  public JsonNode patch(String path, Object body) {
    return request(HttpMethod.PATCH, path, body);
  }

  /**
   * Đọc HẾT một collection, đi theo {@code @odata.nextLink}.
   *
   * <p>Service Layer phân trang MẶC ĐỊNH (20 bản ghi). Quên xử lý nextLink là nguyên
   * nhân kinh điển của "ERP thiếu hàng": code chạy không lỗi, chỉ mất dữ liệu từ bản
   * ghi thứ 21 trở đi.
   */
  public List<JsonNode> listAll(String path) {
    var out = new ArrayList<JsonNode>();
    String next = path;
    while (next != null) {
      var page = get(next);
      if (page == null) {
        break;
      }
      page.path("value").forEach(out::add);
      var link = page.path("@odata.nextLink");
      next = link.isMissingNode() || link.isNull() ? null : "/" + link.asText();
    }
    return out;
  }
}

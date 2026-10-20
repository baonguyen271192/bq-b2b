package vn.com.giaybq.api.web.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

/** Các body nhỏ dùng chung — gom một chỗ thay vì rải mỗi record một file. */
public final class Requests {

  private Requests() {}

  public record PayBody(String method) {
    public String methodOrDefault() {
      return method == null || method.isBlank() ? "Chuyển khoản" : method;
    }
  }

  public record ApproveBody(boolean approve, String approver, String note) {
    public String approverOrDefault() {
      return approver == null || approver.isBlank() ? "Quản lý bán hàng" : approver;
    }
  }

  public record ActorBody(String actor) {
    public String actorOrDefault() {
      return actor == null || actor.isBlank() ? "Quản lý bán hàng" : actor;
    }
  }

  public record ProductBody(
      @NotBlank String code,
      String name,
      String category,
      long retail,
      long wholesale,
      Map<String, Integer> sizes,
      List<String> images
  ) {}

  public record DealerUpdateBody(
      String tier,
      Long creditLimit,
      String owner,
      String phone,
      String email,
      String invoiceAddress
  ) {}

  public record AssistantBody(@NotBlank String dealerCode, @NotBlank String question) {}

  public record SaleAssistantBody(@NotBlank String question) {}
}

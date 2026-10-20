package vn.com.giaybq.api.domain;

/**
 * Đại lý sỉ. {@code creditOpening} là công nợ đầu kỳ từ kế toán/ERP.
 *
 * <p>Jackson serialize sang snake_case (xem application.yml) để khớp hợp đồng
 * OpenAPI mà frontend và mobile đang dùng: {@code credit_limit}, {@code invoice_address}...
 */
public record Dealer(
    String code,
    String name,
    String tier,
    long creditLimit,
    long creditOpening,
    String owner,
    String phone,
    String email,
    String invoiceAddress
) {
  public Dealer withProfile(String tier, Long creditLimit, String owner, String phone,
                            String email, String invoiceAddress) {
    return new Dealer(
        code,
        name,
        tier != null ? tier : this.tier,
        creditLimit != null ? creditLimit : this.creditLimit,
        creditOpening,
        owner != null ? owner : this.owner,
        phone != null ? phone : this.phone,
        email != null ? email : this.email,
        invoiceAddress != null ? invoiceAddress : this.invoiceAddress
    );
  }
}

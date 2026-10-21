package vn.com.giaybq.api.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.Map;

/**
 * Đơn LẺ do bot chốt, bắn vào backend BQ.
 *
 * <p>Hợp đồng này là ranh giới giữa bot (service chat) và BQ. Validate chặt ở đây vì
 * bên kia là tiến trình khác, có thể do người khác bảo trì — không tin dữ liệu vào.
 *
 * <p>{@code subtotal} do bot tính và BQ KIỂM LẠI từ {@code items}: lệch là từ chối.
 * Tin số tổng của bên gọi nghĩa là một lỗi làm tròn bên đó thành sai tiền bên này.
 */
public record CreateRetailOrderRequest(
    @NotEmpty(message = "Đơn phải có ít nhất một mã hàng")
    @Valid List<Item> items,

    @PositiveOrZero long subtotal,
    String payment,

    @NotBlank(message = "Thiếu kênh chat (facebook/zalo)")
    String channel,

    /** Mã người gửi của kênh chat — để nối lại hội thoại khi cần. */
    String senderId,

    @NotBlank(message = "Thiếu tên khách")
    String customerName,

    @NotBlank(message = "Thiếu số điện thoại khách")
    String customerPhone,

    String customerAddress,
    boolean flagged,
    String flagNote,

    /**
     * Khoá chống trùng do bot sinh (vd mã hội thoại + dấu thời gian). Mạng chập chờn
     * khiến bot gửi lại cùng một đơn — thiếu khoá này thì khách bị lên hai đơn.
     */
    String idempotencyKey
) {

  public record Item(
      @NotBlank String code,
      @NotBlank String name,
      @NotEmpty Map<String, @Positive Integer> sizes,
      @Positive long unitPrice
  ) {
    public int qtyTotal() {
      return sizes.values().stream().mapToInt(Integer::intValue).sum();
    }

    public long lineTotal() {
      return unitPrice * qtyTotal();
    }
  }

  /** Tổng tính lại từ dòng hàng — dùng để đối chiếu với {@code subtotal} bot gửi. */
  public long computedSubtotal() {
    return items.stream().mapToLong(Item::lineTotal).sum();
  }
}

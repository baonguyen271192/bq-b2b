/**
 * Thông tin chuyển khoản và việc đại lý tự báo đã chuyển (SPEC §3.10, quyết định F).
 */

export interface BankAccount {
  bank: string;
  branch: string;
  number: string;
  holder: string;
}

/**
 * TODO(api): tài khoản nhận tiền của BQ chưa có endpoint nào trả về. Hằng số
 * dưới đây lấy từ ảnh thiết kế `10-Transfer.png`.
 *
 * ĐỂ Ở ĐÂY, không rải vào màn: đổi số tài khoản mà phải đi sửa trong JSX là
 * cách chắc chắn để sót một chỗ.
 */
export const BQ_BANK: BankAccount = {
  bank: "Vietcombank",
  branch: "CN Đà Nẵng",
  number: "0041 0003 82716",
  holder: "CÔNG TY GIÀY BQ",
};

/**
 * Nội dung chuyển khoản để BQ tự đối soát: `<mã đại lý> <mã hoá đơn>`, bỏ dấu
 * gạch và khoảng trắng thừa vì nhiều ngân hàng cắt ký tự đặc biệt.
 */
export function transferNote(dealerCode: string, invoiceId?: string | null): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  // Trả theo SỐ TIỀN (không gắn hoá đơn nào) thì ghi "TT" — SPEC §3.31. Gắn một
  // mã hoá đơn vào khoản trả một phần sẽ làm kế toán cấn nhầm vào đúng hoá đơn đó.
  return invoiceId ? `${clean(dealerCode)} ${clean(invoiceId)}` : `${clean(dealerCode)} TT`;
}

/**
 * Đại lý tự báo "Tôi đã chuyển khoản".
 *
 * KHÔNG gọi `POST /api/orders/{id}/pay`: endpoint đó ghi nhận thanh toán và
 * GIẢM CÔNG NỢ ngay (`OrderController.pay`) — đó là thao tác đối soát của BQ.
 * Cho app đại lý gọi nó nghĩa là đại lý tự xoá nợ của mình.
 *
 * TODO(api): cần endpoint riêng kiểu `POST /api/orders/{id}/payment-declared`
 * để BQ biết có người báo đã chuyển mà công nợ chưa đổi. Hiện giữ trong phiên
 * nên MẤT khi tắt app.
 */
export interface PaymentDeclarationRepository {
  declare(invoiceId: string): void;
  declared(invoiceId: string): boolean;
  all(): string[];
}

export function createPaymentDeclarationRepository(): PaymentDeclarationRepository {
  const ids = new Set<string>();
  return {
    declare(id) { ids.add(id); },
    declared(id) { return ids.has(id); },
    all() { return [...ids]; },
  };
}

export const paymentDeclarations = createPaymentDeclarationRepository();

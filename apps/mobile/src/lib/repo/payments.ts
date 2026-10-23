import { loadJson, saveJson } from "../storage";

/**
 * Thông tin chuyển khoản và việc đại lý tự báo đã chuyển (SPEC §3.10, quyết định
 * F, và §5-N.4).
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
 * Một lần đại lý tự báo "Tôi đã chuyển khoản".
 *
 * Hai loại, vì có hai đường trả tiền (SPEC §3.31):
 *  - `invoice` — trả đúng một hoá đơn, cấn được ngay vào hoá đơn đó;
 *  - `debt` — trả theo số tiền, chưa gắn vào hoá đơn nào.
 *
 * Bản cũ chỉ nhớ được mã hoá đơn, nên nhánh trả theo số tiền KHÔNG ghi lại gì:
 * đại lý báo đã chuyển gần 300 triệu rồi app im lặng hoàn toàn.
 */
export type PaymentDeclaration = {
  /** Số tiền đã báo chuyển. */
  amount: number;
  /** Nội dung chuyển khoản đã dùng, để đối chiếu với sao kê. */
  content: string;
  /** ISO — giờ máy lúc bấm nút. */
  declaredAt: string;
} & (
  | { kind: "invoice"; invoiceId: string }
  | { kind: "debt" }
);

export interface PaymentDeclarationRepository {
  list(dealerCode: string): Promise<PaymentDeclaration[]>;
  declare(dealerCode: string, declaration: PaymentDeclaration): Promise<void>;
}

/** Khoá lưu theo từng đại lý — máy dùng chung thì hai người không lẫn nhau. */
const key = (dealerCode: string) => `bq.payment-declarations.v1.${dealerCode}`;

/**
 * Đại lý tự báo "Tôi đã chuyển khoản".
 *
 * KHÔNG gọi `POST /api/orders/{id}/pay`: endpoint đó ghi nhận thanh toán và
 * GIẢM CÔNG NỢ ngay (`OrderController.pay`) — đó là thao tác đối soát của BQ.
 * Cho app đại lý gọi nó nghĩa là đại lý tự xoá nợ của mình. **Hạn mức không đổi
 * cho tới khi BQ ghi nhận** (SPEC §5-N.4).
 *
 * TODO(api): cần endpoint riêng kiểu `POST /api/dealers/{code}/payment-declared`
 * để BQ biết có người báo đã chuyển mà công nợ chưa đổi. Hiện lưu
 * `AsyncStorage` nên giữ được qua lần mở app, nhưng KHÔNG sang máy khác và BQ
 * không thấy gì.
 */
export function createPaymentDeclarationRepository(): PaymentDeclarationRepository {
  return {
    async list(dealerCode) {
      return (await loadJson<PaymentDeclaration[]>(key(dealerCode))) ?? [];
    },
    async declare(dealerCode, declaration) {
      const rows = await this.list(dealerCode);
      await saveJson(key(dealerCode), [declaration, ...rows]);
    },
  };
}

export const paymentDeclarations = createPaymentDeclarationRepository();

/** Hoá đơn nào đã được báo chuyển khoản. */
export function declaredInvoiceIds(rows: readonly PaymentDeclaration[]): Set<string> {
  return new Set(rows.filter((r) => r.kind === "invoice").map((r) => r.invoiceId));
}

/** Các khoản trả theo SỐ TIỀN (chưa gắn hoá đơn) — nguồn cho banner ở tab Công nợ. */
export function debtDeclarations(rows: readonly PaymentDeclaration[]): PaymentDeclaration[] {
  return rows.filter((r) => r.kind === "debt");
}

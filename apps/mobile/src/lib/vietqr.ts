/**
 * Dựng chuỗi VietQR (EMVCo Merchant-Presented QR) NGAY TRÊN MÁY.
 *
 * Không cần API ngân hàng: chuỗi này hoàn toàn xác định từ mã BIN ngân hàng, số
 * tài khoản, số tiền và nội dung chuyển khoản. Ứng dụng ngân hàng đọc nó ra và
 * điền sẵn lệnh chuyển tiền.
 *
 * Tham chiếu: EMV QRCPS Merchant-Presented Mode v1.1 và đặc tả VietQR của NAPAS.
 */

/** Mã BIN do NAPAS cấp cho từng ngân hàng. Thêm khi BQ đổi tài khoản nhận. */
export const BANK_BIN: Record<string, string> = {
  Vietcombank: "970436",
  VietinBank: "970415",
  BIDV: "970418",
  Agribank: "970405",
  Techcombank: "970407",
  MBBank: "970422",
  ACB: "970416",
  VPBank: "970432",
  Sacombank: "970403",
  TPBank: "970423",
};

/** GUID của NAPAS trong trường 38. */
const NAPAS_GUID = "A000000727";
/** Chuyển khoản TỚI TÀI KHOẢN (khác `QRIBFTTC` — tới số thẻ). */
const SERVICE_TRANSFER_TO_ACCOUNT = "QRIBFTTA";

/** `id` + độ dài 2 chữ số + giá trị — đơn vị dựng nên mọi trường EMVCo. */
function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/**
 * CRC-16/CCITT-FALSE: đa thức 0x1021, khởi tạo 0xFFFF, không đảo bit, không XOR
 * đầu ra. Tính trên TOÀN BỘ chuỗi kể cả "6304" ở cuối.
 */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Bỏ dấu tiếng Việt và ký tự lạ khỏi nội dung chuyển khoản.
 *
 * Trường 62-08 chỉ nhận ASCII; để nguyên tiếng Việt có dấu thì nhiều app ngân
 * hàng hiện ra ký tự rác hoặc bỏ qua cả trường.
 */
export function asciiNote(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, 99);
}

export interface VietQrInput {
  /** Tên ngân hàng, phải có trong {@link BANK_BIN}. */
  bank: string;
  /** Số tài khoản, khoảng trắng sẽ được bỏ. */
  accountNumber: string;
  /** Số tiền VND. Bỏ trống hoặc 0 thì mã thành loại tĩnh, người dùng tự nhập. */
  amount?: number;
  /** Nội dung chuyển khoản. */
  note?: string;
}

/**
 * Trả về chuỗi để vẽ thành mã QR, hoặc `null` khi chưa biết mã BIN của ngân
 * hàng — thà không vẽ gì còn hơn vẽ một mã quét ra sai tài khoản.
 */
export function buildVietQrPayload({
  bank, accountNumber, amount, note,
}: VietQrInput): string | null {
  const bin = BANK_BIN[bank];
  const account = accountNumber.replace(/\s/g, "");
  if (!bin || !account) return null;

  const merchant = tlv("00", NAPAS_GUID)
    + tlv("01", tlv("00", bin) + tlv("01", account))
    + tlv("02", SERVICE_TRANSFER_TO_ACCOUNT);

  const dynamic = !!amount && amount > 0;
  let payload = tlv("00", "01")
    // "11" = quét nhiều lần, "12" = một lần. Có số tiền thì là lệnh cho đúng
    // hoá đơn đó, nên dùng 12.
    + tlv("01", dynamic ? "12" : "11")
    + tlv("38", merchant)
    + tlv("53", "704")
    + (dynamic ? tlv("54", String(Math.round(amount))) : "")
    + tlv("58", "VN");

  const clean = note ? asciiNote(note) : "";
  if (clean) payload += tlv("62", tlv("08", clean));

  // CRC tính trên chuỗi đã có sẵn "6304" ở cuối.
  const withCrcTag = `${payload}6304`;
  return withCrcTag + crc16(withCrcTag);
}

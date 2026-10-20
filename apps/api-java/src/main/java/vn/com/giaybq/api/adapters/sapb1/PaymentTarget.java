package vn.com.giaybq.api.adapters.sapb1;

import java.util.Locale;
import java.util.Map;

/**
 * Thanh toán của đại lý đối trừ vào đâu trong SAP B1.
 *
 * <p>Đây là QUY TRÌNH KẾ TOÁN của BQ, không phải quyết định kỹ thuật. Cả hai cách đã
 * hiện thực sẵn; chọn bằng {@code SAPB1_PAYMENT_TARGET}.
 *
 * <p>[Unverified] Giá trị {@code InvoiceType} theo tài liệu Service Layer phổ biến —
 * cần đối chiếu với bản cài của BQ trước khi ghi vào ERP thật.
 */
enum PaymentTarget {

  /** Đối trừ vào hoá đơn bán (A/R Invoice). Quy trình chuẩn của B1. */
  INVOICE("it_Invoice"),

  /** Đối trừ thẳng vào đơn bán. Dùng khi BQ thu tiền trước khi xuất hoá đơn. */
  ORDER("it_Order");

  private final String invoiceType;

  PaymentTarget(String invoiceType) {
    this.invoiceType = invoiceType;
  }

  /** Một dòng {@code PaymentInvoices} trong payload {@code /IncomingPayments}. */
  Map<String, Object> paymentLine(int docEntry, long amount) {
    return Map.of(
        "DocEntry", docEntry,
        "SumApplied", amount,
        "InvoiceType", invoiceType);
  }

  /** Collection để ĐỌC lịch sử: hoá đơn công nợ nằm ở Invoices, đơn ở Orders. */
  String sourceCollection() {
    return this == INVOICE ? "/Invoices" : "/Orders";
  }

  static PaymentTarget from(String raw) {
    if (raw == null || raw.isBlank()) {
      return INVOICE;
    }
    try {
      return valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException(
          "SAPB1_PAYMENT_TARGET='" + raw + "' không hợp lệ. Chọn: invoice, order.");
    }
  }
}

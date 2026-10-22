import { StyleSheet, View, type ViewStyle } from "react-native";
import { vnd } from "@bq/core";
import { color, radius, space } from "@/theme";
import { CardDivider } from "./Card";
import { IconButton } from "./IconButton";
import { Num } from "./Num";
import { T } from "./T";

export interface InvoicePreviewLine {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoicePreviewProps {
  serial: string;
  number: string;
  issuedAt: string;
  sellerName: string;
  buyerName: string;
  buyerTaxCode: string;
  buyerAddress: string;
  paymentTerm: string;
  lines: InvoicePreviewLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  /** Mã tra cứu trên cổng hoá đơn điện tử (SPEC §3.22). */
  lookupCode?: string;
  onCopyLookup?: () => void;
  style?: ViewStyle;
}

/**
 * Bản xem hoá đơn VAT (SPEC §3.22).
 *
 * Component này CHỈ hiển thị, không tính gì: `subtotal`, `taxRate`, `taxAmount`,
 * `total` đều phải do hệ thống hoá đơn điện tử trả về (quyết định C). Cộng trừ
 * ở client sẽ lệch với chứng từ gốc — và đây là chứng từ kế toán, không phải
 * một bảng tóm tắt.
 *
 * Đầu cột bảng dùng 13px chứ không 12px như §3.22 vẽ: quyết định B đặt sàn 13
 * cho mọi chữ mang thông tin, không ngoại lệ.
 */
export function InvoicePreview({
  serial, number, issuedAt, sellerName, buyerName, buyerTaxCode, buyerAddress,
  paymentTerm, lines, subtotal, taxRate, taxAmount, total, lookupCode, onCopyLookup, style,
}: InvoicePreviewProps) {
  return (
    <View style={[styles.sheet, style]}>
      <View style={styles.head}>
        <View style={styles.logo}>
          <T variant="label" weight="bold" tone="white">BQ</T>
        </View>
        <View style={styles.headRight}>
          <T variant="small" tone="muted">
            {"Ký hiệu "}
            <T variant="small" weight="bold">{serial}</T>
          </T>
          <T variant="small" tone="muted">
            {"Số "}
            <Num variant="small" weight="bold">{number}</Num>
          </T>
        </View>
      </View>

      <View style={styles.title}>
        <T variant="cardTitle" weight="extrabold" style={styles.center}>
          HOÁ ĐƠN GIÁ TRỊ GIA TĂNG
        </T>
        <T variant="small" tone="muted" style={styles.center}>{`Ngày ${issuedAt}`}</T>
      </View>

      <View style={styles.grid}>
        <Field label="Đơn vị bán" value={sellerName} />
        <Field label="Người mua" value={buyerName} />
        <Field label="MST" value={buyerTaxCode} />
        <Field label="Địa chỉ" value={buyerAddress} />
        <Field label="Thanh toán" value={paymentTerm} />
      </View>

      <CardDivider />

      <View style={styles.tableHead}>
        <T variant="small" weight="semibold" style={styles.colName}>Hàng hoá</T>
        <T variant="small" weight="semibold" style={styles.colQty}>SL</T>
        <T variant="small" weight="semibold" style={styles.colPrice}>Đơn giá</T>
        <T variant="small" weight="semibold" style={styles.colTotal}>Thành tiền</T>
      </View>
      {lines.map((l) => (
        <View key={l.description} style={styles.tableRow}>
          <T variant="small" style={styles.colName} numberOfLines={2}>{l.description}</T>
          <Num variant="small" style={styles.colQty}>{l.quantity}</Num>
          <Num variant="small" style={styles.colPrice}>{l.unitPrice.toLocaleString("vi-VN")}</Num>
          <Num variant="small" style={styles.colTotal}>{l.lineTotal.toLocaleString("vi-VN")}</Num>
        </View>
      ))}

      <CardDivider />

      <View style={styles.sums}>
        <SumRow label="Cộng tiền hàng" value={vnd(subtotal)} />
        <SumRow label={`Thuế GTGT ${taxRate}%`} value={vnd(taxAmount)} />
        <SumRow label="Tổng thanh toán" value={vnd(total)} strong />
      </View>

      {lookupCode ? (
        <>
          <CardDivider />
          <View style={styles.lookup}>
            <T variant="small" tone="muted" style={styles.lookupText}>
              {`Mã tra cứu ${lookupCode}`}
            </T>
            {onCopyLookup ? (
              <IconButton
                icon="copy-outline"
                accessibilityLabel="Sao chép mã tra cứu"
                onPress={onCopyLookup}
                style={styles.lookupBtn}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <T variant="small" tone="muted" style={styles.fieldLabel}>{label}</T>
      <T variant="small" weight="semibold" style={styles.fieldValue}>{value}</T>
    </View>
  );
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.sumRow}>
      <T variant={strong ? "cardTitle" : "small"} weight={strong ? "extrabold" : "regular"}>
        {label}
      </T>
      <Num variant={strong ? "cardTitle" : "small"} weight={strong ? "extrabold" : "regular"}>
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: color.paper, borderRadius: radius.card,
    borderWidth: 1, borderColor: color.line, padding: space.x4, gap: space.x3,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.x3 },
  logo: {
    width: 44, height: 44, borderRadius: radius.chip, backgroundColor: color.brand,
    alignItems: "center", justifyContent: "center",
  },
  headRight: { flex: 1, alignItems: "flex-end", gap: 1 },
  title: { gap: 1 },
  center: { textAlign: "center" },
  grid: { gap: space.x2 },
  field: { flexDirection: "row", gap: space.x3 },
  fieldLabel: { width: 96 },
  fieldValue: { flex: 1 },
  tableHead: { flexDirection: "row", gap: space.x2 },
  tableRow: { flexDirection: "row", gap: space.x2 },
  colName: { flex: 1 },
  colQty: { width: 32, textAlign: "right" },
  colPrice: { width: 72, textAlign: "right" },
  colTotal: { width: 86, textAlign: "right" },
  sums: { gap: space.x2 },
  sumRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.x3 },
  lookup: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  lookupText: { flex: 1 },
  lookupBtn: { width: 36, height: 36 },
});

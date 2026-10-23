import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Order } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { BQ_BANK, paymentDeclarations, transferNote } from "@/lib/repo/payments";
import { buildVietQrPayload } from "@/lib/vietqr";
import { color, radius, space } from "@/theme";
import {
  Card, CardDivider, EmptyState, Notice, Pill, Price, ScreenHeader, T, Toast,
} from "@/components/ui";

/**
 * Chuyển khoản (SPEC §3.10) + quyết định F.
 *
 * "Tôi đã chuyển khoản" CHỈ ghi nhận rằng đại lý đã báo, rồi quay về Công nợ —
 * nó KHÔNG gọi `POST /api/orders/{id}/pay`, vì endpoint đó giảm công nợ ngay và
 * là thao tác đối soát của BQ. Cho app đại lý gọi nghĩa là đại lý tự xoá nợ.
 */
export default function TransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dealer } = useSession();

  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await api.order(id));
    } catch {
      setMissing(true);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setToast(`Đã sao chép ${label}`);
  };

  if (missing) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState
          icon="help-circle-outline"
          title={`Không thấy hoá đơn ${id}`}
          hint="Quay lại màn Công nợ để chọn hoá đơn khác."
          actionLabel="Về Công nợ"
          onActionPress={() => router.replace("/(tabs)/debt")}
        />
      </View>
    );
  }

  if (!order || !dealer) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.brand} />
      </View>
    );
  }

  const note = transferNote(dealer.code, order.id);
  const qr = buildVietQrPayload({
    bank: BQ_BANK.bank,
    accountNumber: BQ_BANK.number,
    amount: order.subtotal,
    note,
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: space.x12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          variant="back"
          title="Chuyển khoản"
          caption={`Thanh toán ${order.id}`}
          onBack={() => router.back()}
        />

        <Card style={styles.qrCard}>
          {/*
            Mã VietQR dựng NGAY TRÊN MÁY (`@/lib/vietqr`), không cần API ngân hàng:
            chuỗi EMVCo xác định hoàn toàn từ mã BIN + số tài khoản + số tiền +
            nội dung. `buildVietQrPayload` trả `null` khi chưa biết mã BIN của
            ngân hàng — lúc đó quay về ô giữ chỗ, vì một mã QR sai còn tệ hơn
            không có mã nào.
          */}
          {qr ? (
            <View style={styles.qrFrame}>
              <QRCode value={qr} size={168} backgroundColor={color.paper} color={color.ink} />
            </View>
          ) : (
            <View style={styles.qr}>
              <Ionicons name="qr-code-outline" size={36} color={color.muted} />
              <T variant="label" weight="semibold" tone="muted">Mã VietQR</T>
              <T variant="chip" tone="muted" style={styles.center}>
                Chưa có mã BIN cho {BQ_BANK.bank}
              </T>
            </View>
          )}
          <T variant="chip" tone="muted">Quét bằng app ngân hàng để chuyển</T>
          <T variant="small" tone="muted">Số tiền</T>
          <Price value={order.subtotal} variant="screenTitle" weight="extrabold" />
        </Card>

        <Card style={styles.info}>
          <Row label="Ngân hàng" value={`${BQ_BANK.bank}, ${BQ_BANK.branch}`} />
          <CardDivider />
          <Row
            label="Số tài khoản"
            value={BQ_BANK.number}
            onCopy={() => void copy("số tài khoản", BQ_BANK.number.replace(/\s/g, ""))}
          />
          <CardDivider />
          <Row label="Chủ tài khoản" value={BQ_BANK.holder} />
          <CardDivider />
          <Row
            label="Nội dung chuyển khoản"
            value={note}
            onCopy={() => void copy("nội dung chuyển khoản", note)}
          />
        </Card>

        <Notice kind="warn">
          Ghi đúng nội dung để BQ tự đối soát. Hạn mức được cập nhật khi BQ ghi
          nhận thanh toán.
        </Notice>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: insets.bottom + space.x5 }]}>
        <Pill
          label="Tôi đã chuyển khoản"
          onPress={() => {
            paymentDeclarations.declare(order.id);
            router.replace("/(tabs)/debt");
          }}
        />
      </View>

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

function Row({
  label, value, onCopy,
}: { label: string; value: string; onCopy?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <T variant="chip" tone="muted">{label}</T>
        <T variant="bodyStrong" weight="bold">{value}</T>
      </View>
      {onCopy ? (
        <Pill
          label="Sao chép"
          tone="outline"
          size={36}
          leading={<Ionicons name="copy-outline" size={14} color={color.ink} />}
          onPress={onCopy}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  center: { justifyContent: "center", paddingHorizontal: space.screen, textAlign: "center" },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  qrCard: { alignItems: "center", gap: space.x2, paddingVertical: space.x6 },
  qrFrame: {
    padding: space.x3, borderRadius: radius.action,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.paper,
    marginBottom: space.x3,
  },
  qr: {
    width: 188, height: 188, borderRadius: radius.action,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: color.line,
    alignItems: "center", justifyContent: "center", gap: space.x1,
    paddingHorizontal: space.x4, marginBottom: space.x3,
  },
  info: { gap: space.x3 },
  row: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  rowText: { flex: 1, gap: 1 },
  // Nền canvas chứ không phải dock trắng (SPEC §3.10).
  foot: { paddingHorizontal: space.screen, paddingTop: space.x3, backgroundColor: color.canvas },
});

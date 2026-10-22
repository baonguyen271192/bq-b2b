import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { invoiceRepository, type VatInvoice } from "@/lib/repo/invoices";
import { color, space } from "@/theme";
import {
  Dock, DOCK_CLEARANCE_ACTIONS, EmptyState, InvoicePreview, Pill, ScreenHeader, StatusTag,
} from "@/components/ui";

/**
 * Hoá đơn VAT (SPEC §3.22).
 *
 * Hiện CHƯA CÓ hoá đơn nào để hiện: không có hệ thống hoá đơn điện tử, và quyết
 * định C cấm app tự tính thuế suất / tiền thuế / đơn giá chưa thuế. Dựng một
 * chứng từ kế toán bằng số tự nghĩ ra là việc không được phép làm, nên màn này
 * nói thẳng là chưa sẵn sàng thay vì hiện một hoá đơn trông như thật.
 *
 * Bố cục hoá đơn vẫn dựng xong ({@link InvoicePreview}) và duyệt được ở
 * `/_dev/ui` — chỉ thiếu nguồn số.
 */
export default function InvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<VatInvoice | null | undefined>();

  const load = useCallback(async () => {
    if (!id) return;
    setInvoice(await invoiceRepository.find(id));
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingTop: insets.top + space.x3,
            paddingBottom: invoice ? DOCK_CLEARANCE_ACTIONS + insets.bottom : space.x12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          variant="back"
          title="Hoá đơn VAT"
          caption={`Đơn ${id ?? ""}`.trim()}
          onBack={() => router.back()}
          trailing={invoice?.signed ? <StatusTag label="Đã ký số" kind="ok" /> : undefined}
        />

        {invoice ? (
          <InvoicePreview
            serial={invoice.serial}
            number={invoice.number}
            issuedAt={invoice.issuedAt}
            sellerName={invoice.sellerName}
            buyerName={invoice.buyerName}
            buyerTaxCode={invoice.buyerTaxCode}
            buyerAddress={invoice.buyerAddress}
            paymentTerm={invoice.paymentTerm}
            lines={invoice.lines}
            subtotal={invoice.subtotal}
            taxRate={invoice.taxRate}
            taxAmount={invoice.taxAmount}
            total={invoice.total}
            lookupCode={invoice.lookupCode}
          />
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="Hoá đơn chưa sẵn sàng"
            hint="BQ phát hành hoá đơn điện tử sau khi giao hàng. Khi có, hoá đơn sẽ hiện ở đây và tải được bản PDF."
            actionLabel="Về Hồ sơ"
            onActionPress={() => router.replace("/(tabs)/profile")}
          />
        )}
      </ScrollView>

      {invoice ? (
        <Dock>
          {/* TODO(api): chưa có link PDF lẫn link chia sẻ của hoá đơn. */}
          <Pill
            label="Chia sẻ"
            tone="outline"
            leading={<Ionicons name="share-outline" size={20} color={color.ink} />}
            onPress={() => {}}
          />
          <Pill label="Tải PDF" style={styles.flex} onPress={() => {}} />
        </Dock>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  flex: { flex: 1 },
});

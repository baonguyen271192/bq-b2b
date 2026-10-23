import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { unpaidInvoices, vnd } from "@bq/core";
import type { CreditDetail } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, radius, space } from "@/theme";
import {
  Card, CardDivider, Checkbox, Dock, DOCK_CLEARANCE_ACTIONS, Notice, Pill, ScreenHeader, T,
} from "@/components/ui";

/** Hệ quả của việc xoá tài khoản (SPEC §3.33). */
const CONSEQUENCES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "log-out-outline", text: "Bạn không đăng nhập app bằng số này được nữa" },
  {
    icon: "document-text-outline",
    text: "Đơn hàng, hoá đơn VAT và chứng từ công nợ vẫn được BQ lưu theo quy định kế toán",
  },
  { icon: "card-outline", text: "Công nợ còn lại vẫn phải thanh toán theo hợp đồng đại lý" },
  { icon: "close", text: "Đơn đang chờ duyệt sẽ bị huỷ" },
];

/**
 * Xoá tài khoản (SPEC §3.33).
 *
 * App Store BẮT BUỘC có đường xoá tài khoản ngay trong app với mọi app có đăng
 * nhập — thiếu nó là bị từ chối lúc nộp, không phải một mục "nên có".
 *
 * TODO(api): chưa có endpoint xoá/yêu cầu xoá. Màn này mới dừng ở gửi yêu cầu;
 * nội dung pháp lý cụ thể còn chờ BQ xác nhận.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, signOut } = useSession();

  const [detail, setDetail] = useState<CreditDetail | null>(null);
  const [agreed, setAgreed] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      setDetail(await api.credit(dealer.code));
    } catch {
      setDetail(null);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!dealer) return null;

  const debt = unpaidInvoices(detail?.invoices ?? []).reduce((s, r) => s + r.order.subtotal, 0);

  const submit = () => {
    Alert.alert(
      "Gửi yêu cầu xoá tài khoản?",
      "BQ sẽ liên hệ xác nhận trước khi xoá. Bạn sẽ được đăng xuất khỏi app ngay bây giờ.",
      [
        { text: "Ở lại", style: "cancel" },
        {
          text: "Gửi yêu cầu",
          style: "destructive",
          onPress: () => {
            // TODO(api): chưa có `POST /api/dealers/{code}/deletion-request`.
            signOut();
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: DOCK_CLEARANCE_ACTIONS + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader variant="back" title="Xoá tài khoản" onBack={() => router.back()} />

        <View style={styles.intro}>
          <View style={styles.icon}>
            <Ionicons name="close" size={24} color={color.danger} />
          </View>
          <View style={styles.introText}>
            <T variant="title">Gửi yêu cầu xoá tài khoản đại lý</T>
            <T variant="label" weight="regular" tone="muted">
              Đọc kỹ trước khi gửi. Việc xoá không hoàn tác được.
            </T>
          </View>
        </View>

        <Card style={styles.list}>
          {CONSEQUENCES.map((c, i) => (
            <View key={c.text}>
              {i > 0 ? <View style={styles.rule}><CardDivider /></View> : null}
              <View style={styles.item}>
                <View style={styles.itemIcon}>
                  <Ionicons name={c.icon} size={18} color={color.muted} />
                </View>
                <T variant="label" weight="regular" style={styles.itemText}>{c.text}</T>
              </View>
            </View>
          ))}
        </Card>

        {debt > 0 ? (
          <Notice kind="warn">
            {`Bạn còn dư nợ ${vnd(debt)}. Sale BQ sẽ gọi xác nhận trước khi xoá.`}
          </Notice>
        ) : null}

        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label="Tôi đã hiểu và muốn gửi yêu cầu xoá tài khoản"
        />
      </ScrollView>

      <Dock>
        <Pill
          label="Gửi yêu cầu xoá"
          tone="danger"
          disabled={!agreed}
          style={styles.flex}
          onPress={submit}
        />
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x4 },
  intro: { flexDirection: "row", gap: space.x3 },
  introText: { flex: 1, gap: space.x2 },
  icon: {
    width: 48, height: 48, borderRadius: radius.pill, backgroundColor: color.dangerTint,
    alignItems: "center", justifyContent: "center",
  },
  list: { gap: 0 },
  item: { flexDirection: "row", alignItems: "center", gap: space.x3, paddingVertical: space.x2 },
  itemIcon: {
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
  itemText: { flex: 1 },
  rule: { marginVertical: space.x1 },
  flex: { flex: 1 },
});

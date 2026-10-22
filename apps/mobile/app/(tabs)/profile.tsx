import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  Avatar, Card, CardDivider, Chip, ListRow, Price, SectionHead, StatPair, T,
} from "@/components/ui";

const MENU = [
  { icon: "location-outline", label: "Sổ địa chỉ", hint: "Kho nhận hàng & địa chỉ giao" },
  { icon: "document-text-outline", label: "Hoá đơn VAT", hint: "Thông tin xuất hoá đơn" },
  { icon: "card-outline", label: "Hướng dẫn chuyển khoản", hint: "Nội dung chuyển khoản để BQ đối soát" },
  { icon: "notifications-outline", label: "Thông báo", hint: "Đơn hàng, công nợ, khuyến mãi" },
  { icon: "help-circle-outline", label: "Hỗ trợ", hint: "Liên hệ Sale phụ trách" },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, signOut } = useSession();

  if (!dealer) return null;

  const contacts = [
    dealer.owner ? { icon: "person-outline" as const, value: dealer.owner } : null,
    dealer.phone ? { icon: "call-outline" as const, value: dealer.phone } : null,
    dealer.email ? { icon: "mail-outline" as const, value: dealer.email } : null,
    dealer.invoice_address
      ? { icon: "business-outline" as const, value: dealer.invoice_address }
      : null,
  ].filter((x) => x !== null);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x3 }]}
      showsVerticalScrollIndicator={false}
    >
      <Card>
        <View style={styles.head}>
          <Avatar name={dealer.name} />
          <View style={styles.headText}>
            {/* Hai dòng chứ không một: avatar 56 + chip hạng ~110 + hai khe 32
                chỉ chừa ~123pt cho tên, trong khi "Đại lý Minh Anh" cần ~140pt.
                Cắt mất tên đại lý là mất thứ quan trọng nhất trên thẻ này. */}
            <T variant="section" numberOfLines={2}>{dealer.name}</T>
            <T variant="small" tone="muted">{dealer.code}</T>
          </View>
          <Chip label={`★ Hạng ${dealer.tier}`} variant="applied" />
        </View>

        <View style={styles.rule}><CardDivider /></View>

        <StatPair
          items={[
            { label: "Hạn mức", value: <Price value={dealer.credit_limit} variant="bodyStrong" /> },
            {
              label: "Khả dụng",
              value: <Price value={dealer.credit_available} variant="bodyStrong" tone="ok" />,
            },
          ]}
        />
      </Card>

      {contacts.length > 0 ? (
        <View>
          <SectionHead title="Thông tin liên hệ" />
          <Card>
            {contacts.map((c) => (
              <View key={c.value} style={styles.infoRow}>
                <Ionicons name={c.icon} size={17} color={color.muted} />
                <T variant="small" style={styles.grow}>{c.value}</T>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <Card variant="flat">
        {MENU.map((m, i) => (
          <View key={m.label}>
            {i > 0 ? <CardDivider /> : null}
            <ListRow icon={m.icon} title={m.label} subtitle={m.hint} onPress={() => {}} />
          </View>
        ))}
      </Card>

      <Card variant="flat">
        <ListRow
          icon="log-out-outline"
          title="Đăng xuất"
          danger
          onPress={() => { signOut(); router.replace("/"); }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x5, paddingBottom: space.x12 },
  head: { flexDirection: "row", gap: space.x4, alignItems: "center" },
  headText: { flex: 1, gap: space.x1 },
  rule: { marginVertical: space.x4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: space.x3, paddingVertical: space.x2 },
  grow: { flex: 1 },
});

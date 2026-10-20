import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, gap: space.lg }}
      showsVerticalScrollIndicator={false}
    >
      <Card>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text variant="h2" color={colors.textOnBrand}>
              {dealer.name.trim().slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h3" numberOfLines={1}>{dealer.name}</Text>
            <Text variant="caption" color={colors.textMuted}>{dealer.code}</Text>
            <Badge label={`★ Hạng ${dealer.tier}`} tone="warning" />
          </View>
        </View>

        <View style={styles.statRow}>
          <Stat label="Hạn mức" value={vnd(dealer.credit_limit)} />
          <View style={styles.vline} />
          <Stat label="Khả dụng" value={vnd(dealer.credit_available)} tone={colors.success.fg} />
        </View>
      </Card>

      {dealer.owner || dealer.phone ? (
        <Card>
          <Text variant="h3" style={{ marginBottom: space.md }}>Thông tin liên hệ</Text>
          {dealer.owner ? <Row icon="person-outline" value={dealer.owner} /> : null}
          {dealer.phone ? <Row icon="call-outline" value={dealer.phone} /> : null}
          {dealer.email ? <Row icon="mail-outline" value={dealer.email} /> : null}
          {dealer.invoice_address ? <Row icon="business-outline" value={dealer.invoice_address} /> : null}
        </Card>
      ) : null}

      <Card padded={false} style={{ overflow: "hidden" }}>
        {MENU.map((m, i) => (
          <Pressable
            key={m.label}
            style={({ pressed }) => [
              styles.menu,
              i > 0 ? styles.menuBorder : null,
              pressed ? { backgroundColor: colors.surfaceSunken } : null,
            ]}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={m.icon} size={19} color={colors.brand[500]} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodySm" weight="600">{m.label}</Text>
              <Text variant="caption" color={colors.textMuted}>{m.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      <Pressable
        onPress={() => { signOut(); router.replace("/"); }}
        style={styles.signOut}
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={19} color={colors.danger.fg} />
        <Text variant="body" weight="700" color={colors.danger.fg}>Đăng xuất</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color={colors.textMuted}>{label}</Text>
      <Text variant="bodySm" weight="700" color={tone ?? colors.text}>{value}</Text>
    </View>
  );
}

function Row({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={colors.textFaint} />
      <Text variant="bodySm" style={{ flex: 1 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: space.lg, alignItems: "center" },
  avatar: {
    width: 56, height: 56, borderRadius: radius.pill,
    backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center",
  },
  statRow: {
    flexDirection: "row", alignItems: "center", marginTop: space.lg,
    paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.border,
  },
  vline: { width: 1, height: 30, backgroundColor: colors.border, marginHorizontal: space.lg },
  infoRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 7 },
  menu: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  menuBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  menuIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.brand.tint, alignItems: "center", justifyContent: "center",
  },
  signOut: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    padding: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.danger.bg, borderWidth: 1, borderColor: colors.danger.border,
  },
});

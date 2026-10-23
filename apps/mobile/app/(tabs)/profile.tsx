import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { dealerIdLine, tierLabel } from "@/lib/dealer";
import { useSession } from "@/lib/session";
import { hotlineContact, prettyPhone, supportContact, telUrl } from "@/lib/support";
import { color, space } from "@/theme";
import {
  Avatar, Card, IconButton, ListRow, Num, ScreenHeader, StatusTag, Switch, T, TAB_BAR_CLEARANCE,
  TextButton,
} from "@/components/ui";

/** Màn Hồ sơ (SPEC §3.11, ảnh `11-Profile.png`). */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, signOut } = useSession();
  /** TODO(api): bật/tắt thông báo đẩy chưa có nơi lưu. */
  const [push, setPush] = useState(true);
  const support = supportContact(dealer);
  const hotline = hotlineContact();

  if (!dealer) return null;

  const confirmSignOut = () => {
    Alert.alert("Đăng xuất?", "Giỏ hàng và đơn nháp trên máy này sẽ bị xoá.", [
      { text: "Ở lại", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: () => { signOut(); router.replace("/"); } },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + space.x3, paddingBottom: TAB_BAR_CLEARANCE },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Hồ sơ" />

      <Card style={styles.dealer}>
        <Avatar name={dealer.name} size={60} />
        <View style={styles.dealerText}>
          <T variant="section">{dealer.name}</T>
          <T variant="small" tone="muted">{dealerIdLine(dealer)}</T>
          <StatusTag label={tierLabel(dealer)} kind="brand" style={styles.tier} />
        </View>
      </Card>

      <Card>
        {/* Thiếu cả tên lẫn số thì bỏ phụ đề, KHÔNG ghi "Chưa có" (SPEC §5-M.3
            và §5-N.6): chữ đó đọc như dữ liệu bị mất. */}
        <ListRow
          icon="person-outline"
          title="Thông tin đại diện"
          subtitle={[dealer.owner, dealer.phone].filter(Boolean).join(", ") || undefined}
          divider
        />
        <ListRow
          icon="location-outline"
          title="Sổ địa chỉ giao hàng"
          subtitle="Kho nhận hàng và địa chỉ giao"
          onPress={() => router.push("/addresses")}
          divider
        />
        <ListRow
          icon="document-text-outline"
          title="Đơn nháp"
          subtitle="Đơn đang chọn dở"
          onPress={() => router.push("/drafts")}
          divider
        />
        <ListRow
          icon="receipt-outline"
          title="Hoá đơn VAT"
          subtitle="Tải PDF, chia sẻ cho kế toán"
          onPress={() => router.push("/invoices")}
          divider
        />
        <ListRow
          icon="notifications-outline"
          title="Thông báo đẩy"
          subtitle="Đơn hàng, công nợ, hoá đơn"
          trailing={
            <Switch value={push} onValueChange={setPush} accessibilityLabel="Thông báo đẩy" />
          }
          divider
        />
        {/* LUÔN hiện, kể cả khi đã có Sale phụ trách (SPEC §5-M.3): Sale có thể
            không nghe máy, lúc đó đại lý cần một số khác ngay trên cùng màn.
            Chưa cấu hình số thì ẩn hẳn hàng này, không hiện số giả. */}
        {hotline ? (
          <ListRow
            icon="call-outline"
            title="Gọi tổng đài BQ"
            subtitle={<Num variant="small" tone="muted">{prettyPhone(hotline.phone)}</Num>}
            accessibilityLabel={`${hotline.label}, ${prettyPhone(hotline.phone)}`}
            onPress={() => void Linking.openURL(telUrl(hotline.phone))}
            trailing={
              <IconButton
                icon="call"
                tone="brand"
                accessibilityLabel={hotline.label}
                onPress={() => void Linking.openURL(telUrl(hotline.phone))}
              />
            }
            divider
          />
        ) : null}

        {/* TODO(api): chưa có URL điều khoản/chính sách của BQ. Mở trang web
            công ty để không phải một dòng chết, và sẽ trỏ đúng khi BQ cấp link. */}
        <ListRow
          icon="shield-checkmark-outline"
          title="Điều khoản và chính sách"
          onPress={() => void Linking.openURL("https://giaybq.vn")}
        />
      </Card>

      {/* Card Sale phụ trách ẨN HẲN khi backend chưa trả `sales_rep` (SPEC §5-M):
          một card ghi "Tổng đài BQ" ở chỗ thiết kế dành cho tên người phụ trách
          là bịa ra một quan hệ không có. Số tổng đài vẫn gọi được từ mọi nút
          "Gọi tổng đài BQ" trong các luồng cần nó. */}
      {support?.isSalesRep ? (
        <Card style={styles.sale}>
          <Avatar name={support.name} tone="info" />
          <View style={styles.saleText}>
            <T variant="chip" tone="muted">Sale phụ trách</T>
            <T variant="bodyStrong" weight="semibold">{support.name}</T>
            <Num variant="small" tone="muted">{prettyPhone(support.phone)}</Num>
          </View>
          <IconButton
            icon="call"
            tone="brand"
            accessibilityLabel={support.label}
            onPress={() => void Linking.openURL(telUrl(support.phone))}
          />
        </Card>
      ) : null}

      {/* Xoá tài khoản nằm CÙNG HÀNG với Đăng xuất (SPEC §3.33): App Store bắt
          buộc app có đăng nhập phải có đường xoá tài khoản ngay trong app. */}
      <View style={styles.accountRow}>
        <TextButton label="Đăng xuất" tone="danger" onPress={confirmSignOut} />
        <TextButton
          label="Xoá tài khoản"
          tone="danger"
          onPress={() => router.push("/delete-account")}
        />
      </View>

      {Constants.expoConfig?.version ? (
        <T variant="chip" tone="muted" style={styles.version}>
          {`Phiên bản ${Constants.expoConfig.version}`}
        </T>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  dealer: { flexDirection: "row", alignItems: "center", gap: space.x4 },
  dealerText: { flex: 1, gap: space.x1 },
  tier: { marginTop: space.x1 },
  sale: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  saleText: { flex: 1, gap: 1 },
  accountRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x3, paddingHorizontal: space.x2, paddingTop: space.x4,
  },
  version: { textAlign: "center" },
});

import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session";
import { color, radius, space } from "@/theme";
import {
  Avatar, Card, IconButton, ListRow, ScreenHeader, StatusTag, Switch, T, TAB_BAR_CLEARANCE,
  TextButton,
} from "@/components/ui";

/** TODO(api): chưa có Sale phụ trách theo từng đại lý — tổng đài chung. */
const SUPPORT = { name: "Tổng đài BQ", phone: "0236 374 5745" };

/** Màn Hồ sơ (SPEC §3.11, ảnh `11-Profile.png`). */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer, signOut } = useSession();
  /** TODO(api): bật/tắt thông báo đẩy chưa có nơi lưu. */
  const [push, setPush] = useState(true);

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
          {/* TODO(api): `Dealer` KHÔNG có mã số thuế (thiết kế ghi "MST 0401 234
              567"). Hiện mã đại lý thôi — gắn nhãn MST cho một trường khác là
              dựng thông tin sai trên chứng từ. */}
          <T variant="small" tone="muted">{dealer.code}</T>
          {/* TODO(api): % chiết khấu theo hạng chưa có trong `Dealer`. */}
          <StatusTag label={`Hạng ${dealer.tier}`} kind="brand" style={styles.tier} />
        </View>
      </Card>

      <Card>
        <ListRow
          icon="person-outline"
          title="Thông tin đại diện"
          subtitle={[dealer.owner, dealer.phone].filter(Boolean).join(", ") || "Chưa có"}
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
        {/* TODO(api): chưa có URL điều khoản/chính sách của BQ. Mở trang web
            công ty để không phải một dòng chết, và sẽ trỏ đúng khi BQ cấp link. */}
        <ListRow
          icon="shield-checkmark-outline"
          title="Điều khoản và chính sách"
          onPress={() => void Linking.openURL("https://giaybq.vn")}
        />
      </Card>

      <Card style={styles.sale}>
        {/* Icon điện thoại, KHÔNG phải chữ viết tắt: `Avatar` rút "Tổng đài BQ"
            thành "ĐB" — hai chữ cái không nói lên gì và trông như tên một người. */}
        <View style={styles.saleIcon}>
          <Ionicons name="headset-outline" size={20} color={color.muted} />
        </View>
        <View style={styles.saleText}>
          <T variant="chip" tone="muted">Hỗ trợ đại lý</T>
          <T variant="bodyStrong" weight="semibold">{SUPPORT.name}</T>
          <T variant="small" tone="muted">{SUPPORT.phone}</T>
        </View>
        <IconButton
          icon="call"
          tone="brand"
          accessibilityLabel={`Gọi ${SUPPORT.name}`}
          onPress={() => void Linking.openURL(`tel:${SUPPORT.phone.replace(/\s/g, "")}`)}
        />
      </Card>

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

      <T variant="chip" tone="muted" style={styles.version}>
        {`Phiên bản ${Constants.expoConfig?.version ?? "—"}`}
      </T>
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
  saleIcon: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: color.subtle,
    alignItems: "center", justifyContent: "center",
  },
  saleText: { flex: 1, gap: 1 },
  accountRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x3, paddingHorizontal: space.x2, paddingTop: space.x4,
  },
  version: { textAlign: "center" },
});

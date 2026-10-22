import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Dealer, Product } from "@bq/types";
import { ProductCard } from "@/components/product/ProductCard";
import {
  Avatar, Badge, Card, CardDivider, ChatBubble, Chip, CreditCard, DetailRow, Dock, DOCK_CLEARANCE,
  EmptyState, IconButton, ListRow, Notice, Num, OptionRow, Pill, Price, ProductImage, ScreenHeader,
  SearchField, SectionHead, SegmentedControl, StatPair, StatusTag, Stepper, T, TextField, Timeline,
} from "@/components/ui";
import { color, radius, space } from "@/theme";

/**
 * Trưng bày mọi component với mọi biến thể — nơi duyệt giao diện, và là bằng
 * chứng component chạy độc lập được với màn hình thật.
 *
 * Chỉ truy cập trong bản dev (`/_dev/ui`). Không có link nào trỏ tới.
 */

const DEMO_DEALER: Dealer = {
  code: "DL001", name: "Đại lý Minh Anh", tier: "Vàng",
  credit_limit: 50_000_000, credit_used: 11_197_000, credit_available: 38_803_000,
};

const DEMO_PRODUCT: Product = {
  code: "GBW0295",
  name: "Giày cao gót mũi vuông quai ngang Solara GBW0295",
  category: "Giày Nữ", retail: 689_000, wholesale: 448_000, price: 425_600,
  sizes: { "35": 60, "36": 80, "37": 0, "38": 55, "39": 40 },
  image: "https://cdn.hstatic.net/products/200000473357/g2-1_23e8955f90b74e42ba29b335c679bc7f.jpg",
};

const SOLD_OUT: Product = { ...DEMO_PRODUCT, code: "SA003", sizes: { "35": 0, "36": 0 } };

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export default function UiShowcase() {
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState(0);
  const [query, setQuery] = useState("");
  const [seg, setSeg] = useState<"all" | "wait" | "done">("all");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.x4,
            // Chừa chỗ cho CẢ hai thanh nổi. Thiếu padding thì mục cuối bị che —
            // đã gặp đúng lỗi đó ở lần chụp đầu: Dock đè lên mục "Pill".
            paddingBottom: DOCK_CLEARANCE + space.x12 * 2,
          },
        ]}
      >
        <ScreenHeader
          eyebrow="Thư viện giao diện"
          title="Component"
          caption="Mọi biến thể, dùng để duyệt thiết kế"
          trailing={<IconButton icon="color-palette-outline" accessibilityLabel="Bảng màu" />}
        />

        <SectionHead title="Chữ" />
        <Card>
          <T variant="display">Display 34</T>
          <T variant="title">Title 24</T>
          <T variant="heading">Heading 18</T>
          <T variant="body">Body 15 — đoạn văn thường của app.</T>
          <T variant="small" tone="muted">Small 13 muted</T>
          <T variant="micro" tone="faint">MICRO 11 FAINT</T>
          <Num variant="title">1234567890</Num>
          <Price value={1_378_000} suffix=" /đôi" variant="heading" />
        </Card>

        <SectionHead title="Pill — 4 tone" />
        <View style={styles.stack}>
          <Pill label="Tạo đơn hàng mới" tone="brand" />
          <Pill label="Lưu đơn nháp" tone="ink" />
          <Pill label="Xem tất cả đơn" tone="outline" />
          <Pill label="Trên nền tối" tone="paper" />
          <Pill label="Đang khoá" tone="brand" disabled />
        </View>

        <SectionHead title="IconButton — 4 tone" />
        <Row>
          <IconButton icon="cart-outline" accessibilityLabel="Giỏ hàng" badge={3} />
          <IconButton icon="notifications-outline" tone="dark" accessibilityLabel="Thông báo" />
          <IconButton icon="heart-outline" tone="brand" accessibilityLabel="Yêu thích" />
          <View style={styles.glassBed}>
            <IconButton icon="arrow-back" tone="glass" accessibilityLabel="Quay lại" />
          </View>
          <IconButton icon="share-outline" accessibilityLabel="Chia sẻ" disabled />
        </Row>

        <SectionHead title="Chip · StatusTag · Badge" />
        <Row>
          <Chip label="Tất cả" active onPress={() => {}} />
          <Chip label="Giày Nữ" onPress={() => {}} />
          <Chip label="Hạng Vàng" tone="brand" />
        </Row>
        <Row>
          <StatusTag label="Hoàn tất" kind="ok" />
          <StatusTag label="Chờ duyệt" kind="warn" />
          <StatusTag label="Đang giao" kind="info" />
          <StatusTag label="Đã huỷ" kind="danger" />
          <StatusTag label="Nháp" />
        </Row>
        <Row>
          <Badge count={1} /><Badge count={12} /><Badge count={420} />
        </Row>

        <SectionHead title="SearchField" />
        <SearchField value={query} onChangeText={setQuery} />

        <SectionHead title="SegmentedControl" />
        <SegmentedControl
          value={seg}
          onChange={setSeg}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "wait", label: "Chờ duyệt" },
            { value: "done", label: "Hoàn tất" },
          ]}
        />

        <SectionHead title="Stepper — 0 và > 0" />
        <Row>
          <Stepper value={0} onChange={() => {}} subject="size 35" />
          <Stepper value={qty} onChange={setQty} max={40} longPressStep={5} subject="size 39" />
        </Row>

        <SectionHead title="Card + ListRow" />
        <Card variant="flat">
          <ListRow icon="person-outline" title="Thông tin đại lý" subtitle="DL001 · Hạng Vàng" onPress={() => {}} />
          <CardDivider />
          <ListRow icon="receipt-outline" title="Hoá đơn BQ1017" trailing={<Price value={1_197_000} variant="small" />} />
          <CardDivider />
          <ListRow icon="log-out-outline" title="Đăng xuất" danger onPress={() => {}} />
        </Card>

        <SectionHead title="ProductImage · ProductCard" />
        <Row>
          <ProductCard product={DEMO_PRODUCT} isNew style={styles.half} />
          <ProductCard product={SOLD_OUT} style={styles.half} />
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
          <ProductCard product={DEMO_PRODUCT} variant="spotlight" isNew />
          <ProductCard product={DEMO_PRODUCT} variant="spotlight" />
        </ScrollView>
        <ProductImage uri={DEMO_PRODUCT.image} shape="hero" />

        <SectionHead title="CreditCard" />
        <CreditCard
          limit={DEMO_DEALER.credit_limit}
          used={DEMO_DEALER.credit_used}
          pending={4_000_000}
          detailLabel="Xem chi tiết công nợ"
          onPressDetail={() => {}}
        />

        <SectionHead title="EmptyState" />
        <Card>
          <EmptyState
            icon="cart-outline"
            title="Giỏ hàng trống"
            hint="Chọn mẫu ở tab Sản phẩm rồi nhập số lượng theo size để tạo đơn."
            actionLabel="Xem sản phẩm"
            onActionPress={() => {}}
          />
        </Card>

        <SectionHead title="TextField · OptionRow" />
        <View style={styles.stack}>
          <TextField label="Số điện thoại" prefix="+84" value="912 345 468" onChangeText={() => {}} />
          <TextField
            label="Mã sai"
            value="0000"
            onChangeText={() => {}}
            error="Mã không đúng, thử lại."
          />
          <OptionRow label="Kho HCM" selected onPress={() => {}} />
          <OptionRow label="Kho Hà Nội" selected={false} onPress={() => {}} />
        </View>

        <SectionHead title="Notice — 4 loại" />
        <View style={styles.stack}>
          <Notice kind="info">Đơn sẽ được xác nhận trong giờ hành chính.</Notice>
          <Notice kind="warn">Đơn vượt hạn mức, Sale sẽ duyệt trước khi xử lý.</Notice>
          <Notice kind="danger">Không gửi được đơn. Kiểm tra mạng rồi thử lại.</Notice>
          <Notice kind="ok">Đã nhận đơn, BQ đang đóng gói.</Notice>
        </View>

        <SectionHead title="Avatar · StatPair · DetailRow" />
        <Card>
          <View style={styles.row}>
            <Avatar name="Đại lý Minh Anh" />
            <T variant="heading">Đại lý Minh Anh</T>
          </View>
          <View style={styles.rule}><CardDivider /></View>
          <StatPair
            items={[
              { label: "Hạn mức", value: <Price value={50_000_000} variant="bodyStrong" /> },
              { label: "Khả dụng", value: <Price value={38_803_000} variant="bodyStrong" tone="ok" /> },
            ]}
          />
          <View style={styles.rule}><CardDivider /></View>
          <DetailRow label="Giao tới" value="Kho HCM" />
          <DetailRow label="Tổng cộng" strong value={<Price value={2_553_600} variant="bodyStrong" />} />
        </Card>

        <SectionHead title="Timeline" />
        <Card>
          <Timeline
            current={2}
            steps={["Chờ xác nhận", "Đã xác nhận", "Đang đóng gói", "Đang giao", "Đại lý đã nhận"]}
          />
        </Card>

        <SectionHead title="ChatBubble" />
        <View style={styles.stack}>
          <ChatBubble from="bot">Em tra được tồn kho, công nợ hoặc lên đơn nhanh.</ChatBubble>
          <ChatBubble from="me">Đặt 20 đôi size 40-42 giao kho HCM</ChatBubble>
        </View>

        <SectionHead title="Dock (ví dụ nội dung)" />
        <Card>
          <T variant="small" tone="muted">
            Dock thật được ghim ở đáy màn hình. Xem bản ghim ở dưới cùng trang này.
          </T>
        </Card>
      </ScrollView>

      <Dock style={styles.dockDemo}>
        <View style={styles.dockRow}>
          <View>
            <T variant="micro" tone="muted">6 đôi</T>
            <Price value={2_553_600} variant="heading" />
          </View>
          <Pill label="Thêm vào giỏ" tone="brand" style={styles.flex} />
        </View>
      </Dock>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space.screen, gap: space.x3 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.x2 },
  stack: { gap: space.x2 },
  rule: { marginVertical: space.x3 },
  half: { flexBasis: "47%", flexGrow: 0 },
  hscroll: { gap: space.x3, paddingVertical: space.x1 },
  glassBed: { backgroundColor: color.plate, padding: space.x2, borderRadius: radius.pill },
  // Thanh tab giờ do expo-router dựng (app/(tabs)/_layout.tsx), không còn
  // component riêng để trưng ở đây. Chừa một khoảng cố định cho Dock demo.
  dockDemo: { bottom: space.x12 * 2 },
  dockRow: { flexDirection: "row", alignItems: "center", gap: space.x4 },
  flex: { flex: 1 },
});

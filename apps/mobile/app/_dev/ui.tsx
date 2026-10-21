import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Dealer, Product } from "@bq/types";
import { CreditCard } from "@/components/credit/CreditCard";
import { TabBar, TABBAR_CLEARANCE } from "@/components/nav/TabBar";
import { ProductCard } from "@/components/product/ProductCard";
import {
  Badge, Card, CardDivider, Chip, Dock, DOCK_CLEARANCE, EmptyState, IconButton, ListRow, Num, Pill,
  Price, ProductImage, ScreenHeader, SearchField, SectionHead, SegmentedControl,
  StatusTag, Stepper, T,
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
  const [tab, setTab] = useState("index");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.x4,
            // Chừa chỗ cho CẢ hai thanh nổi. Thiếu padding thì mục cuối bị che —
            // đã gặp đúng lỗi đó ở lần chụp đầu: Dock đè lên mục "Pill".
            paddingBottom: TABBAR_CLEARANCE + DOCK_CLEARANCE + space.x6,
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
          dealer={DEMO_DEALER}
          pendingAmount={4_000_000}
          nextDue={{ label: "BQ1017 · còn 12 ngày", amount: 1_197_000 }}
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

      <TabBar
        activeKey={tab}
        onSelect={setTab}
        items={[
          { key: "index", label: "Trang chủ", icon: "home-outline", iconActive: "home" },
          { key: "products", label: "Sản phẩm", icon: "pricetags-outline", iconActive: "pricetags" },
          { key: "orders", label: "Đơn hàng", icon: "receipt-outline", iconActive: "receipt", badge: 2 },
          { key: "debt", label: "Công nợ", icon: "card-outline", iconActive: "card" },
          { key: "profile", label: "Hồ sơ", icon: "person-outline", iconActive: "person" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space.screen, gap: space.x3 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.x2 },
  stack: { gap: space.x2 },
  half: { flexBasis: "47%", flexGrow: 0 },
  hscroll: { gap: space.x3, paddingVertical: space.x1 },
  glassBed: { backgroundColor: color.plate, padding: space.x2, borderRadius: radius.pill },
  dockDemo: { bottom: TABBAR_CLEARANCE },
  dockRow: { flexDirection: "row", alignItems: "center", gap: space.x4 },
  flex: { flex: 1 },
});

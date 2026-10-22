import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Product } from "@bq/types";
import { vndShort } from "@bq/core";
import { ProductCard } from "@/components/product/ProductCard";
import {
  Address, AddressCard, Avatar, Badge, BottomSheet, Card, CardDivider, ChatBubble, Chip,
  CreditCard, DashedButton, DetailRow, Dock, DOCK_CLEARANCE, EmptyState, IconButton, ListRow,
  Notice, Num, Pill, Price, ProductImage, ProductMini, QuickAction, RadioCard, ScreenHeader,
  SearchField, SectionHead, SegmentedControl, Select, SizeChip, SizeList, SizeQty, Skeleton,
  StatPair, StatusTag, Stepper, Switch, T, TabBar, TextButton, TextField, Timeline,
} from "@/components/ui";
import { color, radius, space, textStyle } from "@/theme";

/**
 * Trưng bày mọi component §2 với mọi biến thể — nơi duyệt giao diện, và là bằng
 * chứng component chạy độc lập được với màn hình thật.
 *
 * Chỉ truy cập trong bản dev (`/_dev/ui`). Không có link nào trỏ tới.
 */

const DEMO_PRODUCT: Product = {
  code: "OX-001",
  name: "Giày cỏ nam da thật cột dây đế cao 3cm BQ GV 1916",
  category: "Giày tây", retail: 1_350_000, wholesale: 1_150_000, price: 1_080_000,
  sizes: { "38": 8, "39": 96, "40": 0, "41": 150, "42": 42, "43": 12, "44": 0 },
  image: "https://cdn.hstatic.net/products/200000473357/g2-1_23e8955f90b74e42ba29b335c679bc7f.jpg",
};

const DEMO_ADDRESS: Address = {
  id: "kho-hoi-an", label: "Kho Hội An",
  recipient: "Trần Văn Bình", phone: "0905 662 731",
  street: "210 Cửa Đại", ward: "Phường Cẩm Châu", province: "Quảng Nam",
};

const PROVINCES = [
  { value: "48", label: "Đà Nẵng" },
  { value: "49", label: "Quảng Nam" },
  { value: "79", label: "TP. Hồ Chí Minh" },
  { value: "01", label: "Hà Nội" },
];

export default function UiShowcase() {
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState(2);
  const [sizes, setSizes] = useState<SizeQty>({ "39": 8, "41": 12 });
  const [seg, setSeg] = useState("all");
  const [tab, setTab] = useState("home");
  const [q, setQ] = useState("");
  const [on, setOn] = useState(true);
  const [picked, setPicked] = useState("a");
  const [province, setProvince] = useState<string>();
  const [sheet, setSheet] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: DOCK_CLEARANCE + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Bộ giao diện"
          caption="SPEC v2 · 20 component dùng chung"
          trailing={<IconButton icon="cart-outline" badge={2} accessibilityLabel="Giỏ hàng" />}
        />

        <Group title="Thang chữ">
          <Card>
            {(Object.keys(textStyle) as (keyof typeof textStyle)[]).map((k) => (
              <T key={k} variant={k} numberOfLines={1}>
                {`${k} · ${textStyle[k].fontSize}/${textStyle[k].weight}`}
              </T>
            ))}
          </Card>
        </Group>

        <Group title="Màu — nền cam có chữ trắng vs cam làm chữ">
          <View style={styles.row}>
            <Swatch bg={color.brand} label="brand" note="trắng 4.79:1" />
            <Swatch bg={color.brandDeep} label="brandDeep" note="trắng 6.64:1" />
            <Swatch bg={color.flame} label="flame" note="trắng 3.56:1 — chỉ chữ lớn" />
          </View>
          <Card>
            <T variant="bodyStrong" tone="brand">Chữ cam trên nền sáng dùng textBrand (6.64:1)</T>
          </Card>
        </Group>

        <Group title="ScreenHeader · back">
          <ScreenHeader variant="back" title="Giỏ hàng" caption="2 mẫu, 50 đôi" onBack={() => {}} />
        </Group>

        <Group title="Pill">
          <Pill label="Thêm vào giỏ" />
          <Pill label="Đã nhận hàng" tone="ink" />
          <Pill label="Lưu nháp" tone="outline" />
          <Pill label="Đang gửi đơn…" loading loadingLabel="Đang gửi đơn…" />
          <Pill label="Xác nhận" disabled />
          <View style={styles.row}>
            <Pill label="Chuyển vào giỏ" size={48} />
            <Pill label="Thêm vào giỏ" size={44} />
            <Pill label="Sửa" tone="outline" size={40} />
            <Pill label="Trả ngay" size={36} />
          </View>
        </Group>

        <Group title="IconButton · TextButton · DashedButton">
          <View style={styles.row}>
            <IconButton icon="notifications-outline" badge={2} accessibilityLabel="Thông báo" />
            <IconButton icon="heart-outline" tone="glass" accessibilityLabel="Yêu thích" />
            <IconButton icon="call" tone="brand" accessibilityLabel="Gọi Sale" />
            <IconButton icon="chevron-forward" tone="dark" accessibilityLabel="Chi tiết" />
            <TextButton label="Đặt mặc định" />
            <TextButton label="Sửa size" underline />
            <TextButton label="Xoá" tone="danger" />
          </View>
          <DashedButton label="Thêm địa chỉ mới" />
        </Group>

        <Group title="Badge · Chip · SizeChip · StatusTag">
          <View style={styles.row}>
            <Badge count={3} />
            <Chip label="Giày tây" onPress={() => {}} />
            <Chip label="Tất cả" selected onPress={() => {}} />
            <Chip label="Size 41" variant="applied" onRemove={() => {}} onPress={() => {}} />
            <Chip label="Bán chạy" variant="filter" dropdown onPress={() => {}} />
            <SizeChip size={41} qty={12} />
          </View>
          <View style={styles.row}>
            <StatusTag label="Đã nhận hàng" kind="ok" />
            <StatusTag label="Chờ duyệt hạn mức" kind="warn" />
            <StatusTag label="Đang giao" kind="info" />
            <StatusTag label="Bị từ chối" kind="danger" />
            <StatusTag label="Giá hạng Vàng" kind="brand" />
          </View>
        </Group>

        <Group title="CreditCard">
          <CreditCard
            label="Hạn mức khả dụng"
            amount={187_600_000}
            chip={<StatusTag label="✓ Hạng Vàng, CK 20%" kind="brand" />}
            progress={312.4 / 500}
            stats={[
              { label: "Tổng hạn mức", value: vndShort(500_000_000) },
              { label: "Đã dùng", value: vndShort(312_400_000) },
            ]}
          />
        </Group>

        <Group title="QuickAction">
          <View style={styles.row}>
            <QuickAction icon="add" label="Tạo đơn" tone="ink" />
            <QuickAction icon="refresh" label="Đặt lại" />
            <QuickAction icon="document-text-outline" label="Đơn nháp" badge={1} />
            <QuickAction icon="sparkles-outline" label="Trợ lý AI" />
          </View>
        </Group>

        <Group title="Stepper — chạm số để nhập, giữ +/− để lặp">
          <View style={styles.row}>
            <Stepper value={qty} onChange={setQty} max={96} subject="size 39" />
            <Stepper value={0} onChange={() => {}} max={8} subject="size 38" />
            <Stepper value={0} onChange={() => {}} soldOut subject="size 40" />
          </View>
        </Group>

        <Group title="SizeList">
          <Card>
            <SizeList stock={DEMO_PRODUCT.sizes} value={sizes} onChange={setSizes} />
          </Card>
        </Group>

        <Group title="ProductCard · ProductMini · ProductImage">
          <View style={styles.grid}>
            <ProductCard
              product={DEMO_PRODUCT}
              tag="Bán chạy"
              favourite
              onToggleFavourite={() => {}}
              onQuickAdd={() => {}}
            />
            <ProductCard product={DEMO_PRODUCT} tag="Mới" onQuickAdd={() => {}} />
          </View>
          <ProductCard product={DEMO_PRODUCT} stockNote="Tồn kho lúc 09:12" />
          <View style={styles.row}>
            <ProductMini name={DEMO_PRODUCT.name} price={DEMO_PRODUCT.price} image={DEMO_PRODUCT.image} />
            <ProductImage uri={DEMO_PRODUCT.image} style={styles.thumb} />
          </View>
        </Group>

        <Group title="RadioCard · Switch · Select">
          <RadioCard
            selected={picked === "a"}
            onPress={() => setPicked("a")}
            title="Gửi đơn chờ Sale duyệt"
            description="Sale sẽ xem xét nâng hạn mức cho đơn này."
          />
          <RadioCard selected={picked === "b"} onPress={() => setPicked("b")}>
            <AddressCard address={{ ...DEMO_ADDRESS, isDefault: true }} variant="select" />
          </RadioCard>
          <Card>
            <ListRow
              title="Thông báo đẩy"
              subtitle="Đơn hàng, công nợ, hoá đơn"
              icon="notifications-outline"
              trailing={<Switch value={on} onValueChange={setOn} accessibilityLabel="Thông báo đẩy" />}
            />
          </Card>
          <Select
            label="Tỉnh / Thành phố"
            placeholder="Chọn tỉnh, thành phố"
            options={PROVINCES}
            value={province}
            onChange={setProvince}
          />
          <Select
            label="Phường / Xã"
            placeholder="Chọn phường, xã"
            options={[]}
            onChange={() => {}}
            disabled={!province}
            disabledHint="Chọn tỉnh, thành phố trước"
          />
        </Group>

        <Group title="AddressCard · manage">
          <AddressCard address={{ ...DEMO_ADDRESS, isDefault: true }} onEdit={() => {}} />
          <AddressCard address={DEMO_ADDRESS} onEdit={() => {}} onSetDefault={() => {}} />
        </Group>

        <Group title="SegmentedControl · SearchField · TextField">
          <SegmentedControl
            options={[
              { value: "all", label: "Tất cả" },
              { value: "wait", label: "Chờ duyệt", count: 1 },
              { value: "ship", label: "Đang giao", count: 1 },
              { value: "done", label: "Đã nhận" },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <SearchField value={q} onChangeText={setQ} placeholder="Tìm tên hoặc mã mẫu" />
          <TextField label="Người nhận" value="" onChangeText={() => {}} placeholder="Họ và tên" />
        </Group>

        <Group title="Card · ListRow · DetailRow · StatPair · Timeline">
          <Card>
            <ListRow title="Sổ địa chỉ giao hàng" subtitle="3 địa chỉ" icon="location-outline" onPress={() => {}} divider />
            <ListRow title="Hoá đơn VAT" subtitle="Tải PDF, chia sẻ cho kế toán" icon="receipt-outline" onPress={() => {}} />
          </Card>
          <Card>
            <DetailRow label="Tạm tính (50 đôi)" value={<Price value={57_780_000} />} />
            <DetailRow label="Vận chuyển" value={<T variant="bodyStrong" tone="ok">Miễn phí</T>} />
            <View style={styles.rule}><CardDivider /></View>
            <DetailRow label="Tổng thanh toán" strong value={<Price value={57_780_000} variant="cardTitle" />} />
          </Card>
          <Card>
            <StatPair items={[{ label: "Đơn tháng này", value: <Num variant="cardTitle" weight="bold">12</Num> }, { label: "Tổng đôi", value: <Num variant="cardTitle" weight="bold">428</Num> }]} />
          </Card>
          <Card>
            <Timeline
              steps={[
                { label: "Gửi đơn", caption: "18/10/2026 08:30", state: "done" },
                { label: "BQ xác nhận", caption: "18/10/2026 10:15", state: "done" },
                { label: "Đang giao", caption: "20/10/2026 09:30", state: "current" },
                { label: "Đã nhận hàng", caption: "Dự kiến 22/10/2026", state: "todo" },
              ]}
            />
          </Card>
        </Group>

        <Group title="Notice · EmptyState · Skeleton · ChatBubble · Avatar">
          <Notice kind="warn">Đơn vượt hạn mức 12.440.000đ. Bạn vẫn đặt được, đơn sẽ chờ Sale duyệt.</Notice>
          <Notice kind="ok">Sau đơn này hạn mức còn 129.820.000đ</Notice>
          <Card>
            <EmptyState icon="bag-outline" title="Giỏ hàng đang trống" hint="Chọn mẫu rồi đặt số lượng theo từng size." />
          </Card>
          <View style={styles.row}>
            <Skeleton width={120} height={16} />
            <Skeleton width={72} height={16} />
          </View>
          <ChatBubble from="bot">Chào anh Phát, em có thể tra tồn kho, công nợ hoặc lên đơn nhanh cho anh.</ChatBubble>
          <ChatBubble from="me">Đặt 20 đôi OX-002 size 40–42, giao kho Hội An</ChatBubble>
          <View style={styles.row}>
            <Avatar name="Đại lý Minh Phát" />
            <Avatar name="Trần Thu Hà" tone="info" />
          </View>
        </Group>

        <Group title="BottomSheet">
          <Pill label="Mở sheet" tone="outline" onPress={() => setSheet(true)} />
        </Group>

        <Group title="TabBar">
          <View style={styles.tabDemo}>
            <TabBar
              items={[
                { key: "home", icon: "home-outline", label: "Trang chủ" },
                { key: "products", icon: "grid-outline", label: "Sản phẩm" },
                { key: "orders", icon: "receipt-outline", label: "Đơn hàng" },
                { key: "debt", icon: "card-outline", label: "Công nợ" },
                { key: "profile", icon: "person-outline", label: "Hồ sơ" },
              ]}
              active={tab}
              onSelect={setTab}
            />
          </View>
        </Group>
      </ScrollView>

      <Dock
        left={{ label: "18 đôi đã chọn", value: <Price value={23_220_000} variant="amountSm" /> }}
        right={{ label: "Hạn mức còn", value: <Price value={164_380_000} variant="label" /> }}
      >
        <Pill label="Thêm vào giỏ" style={styles.flex} />
      </Dock>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Đặt nhanh">
        <SizeList stock={DEMO_PRODUCT.sizes} value={sizes} onChange={setSizes} />
      </BottomSheet>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <SectionHead title={title} />
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

/**
 * Ô màu: nhãn nằm DƯỚI ô, màu ink.
 *
 * Đặt nhãn trắng đè lên ô thì chính trang trưng bày vi phạm cái nó đang mô tả —
 * chữ 11px trắng trên `flame` là 3.56:1.
 */
function Swatch({ bg, label, note }: { bg: string; label: string; note: string }) {
  return (
    <View style={styles.swatchWrap}>
      <View style={[styles.swatch, { backgroundColor: bg }]} />
      <T variant="chip" weight="bold">{label}</T>
      <T variant="badge" tone="muted">{note}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x6 },
  group: { gap: space.x3 },
  groupBody: { gap: space.x3 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.x3 },
  grid: { flexDirection: "row", gap: space.x3 },
  thumb: { width: 96 },
  rule: { marginVertical: space.x3 },
  flex: { flex: 1 },
  swatchWrap: { flex: 1, minWidth: 96, gap: space.x1 },
  swatch: { height: 56, borderRadius: radius.chip },
  // TabBar tự neo xuống đáy màn; bọc trong khối cao 96 để xem được trong trang này.
  tabDemo: { height: 96 },
});

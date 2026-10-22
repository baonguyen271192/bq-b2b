import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  Card, Chip, Dock, DOCK_CLEARANCE, Pill, Price, ProductImage, SizeGrid, T, type SizeQty,
} from "@/components/ui";

/**
 * Bề rộng một ảnh trong băng ngang, theo tỉ lệ bề rộng màn.
 *
 * Phải tính ra SỐ TUYỆT ĐỐI chứ không khai `width: "82%"`: phần trăm bên trong
 * contentContainer của ScrollView ngang không có chiều rộng cha xác định nên
 * React Native giải ra 0 — ảnh biến mất.
 *
 * Dưới 1 để mép ảnh sau ló ra, cho biết còn vuốt được.
 */
const PHOTO_RATIO = 0.82;

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { dealer } = useSession();
  const { upsert, lines } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const existing = lines.find((l) => l.code === code);
  const [sizes, setSizes] = useState<SizeQty>(existing?.sizes ?? {});

  useEffect(() => {
    if (!dealer || !code) return;
    // Lấy từ danh sách theo đại lý để có GIÁ ĐÚNG THEO BẬC; endpoint sản phẩm
    // đơn lẻ không nhận tham số đại lý nên sẽ trả giá sỉ cơ bản.
    void api.products(dealer.code)
      .then((all) => setProduct(all.find((p) => p.code === code) ?? null))
      .catch(() => setProduct(null));
  }, [dealer, code]);

  const totals = useMemo(() => {
    const pairs = Object.values(sizes).reduce((s, n) => s + n, 0);
    return { pairs, money: pairs * (product?.price ?? 0) };
  }, [sizes, product]);

  if (!product) {
    return <View style={styles.center}><ActivityIndicator color={color.bq} /></View>;
  }

  const margin = product.retail - product.price;
  const photos = product.images?.length ? product.images : [product.image];
  const addToCart = () => {
    upsert(product, sizes);
    router.push("/cart");
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: DOCK_CLEARANCE + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
          contentContainerStyle={styles.galleryContent}
        >
          {photos.map((uri, i) => (
            <ProductImage key={i} uri={uri} style={{ width: width * PHOTO_RATIO }} />
          ))}
        </ScrollView>

        <View style={styles.head}>
          <View style={styles.codeRow}>
            <T variant="micro" tone="faint">{product.code}</T>
            {dealer ? <Chip label={`★ Hạng ${dealer.tier}`} tone="brand" /> : null}
          </View>
          <T variant="title">{product.name}</T>
          <View style={styles.priceRow}>
            <Price value={product.price} variant="display" tone="bq" />
            <T variant="small" tone="muted">/ đôi · giá sỉ</T>
          </View>
        </View>

        <Card style={styles.marginCard}>
          <View style={styles.stat}>
            <T variant="micro" tone="muted">Giá lẻ đề xuất</T>
            <Price value={product.retail} variant="bodyStrong" />
          </View>
          <View style={styles.vline} />
          <View style={styles.stat}>
            <T variant="micro" tone="muted">Lợi nhuận / đôi</T>
            <Price value={margin} variant="bodyStrong" tone="ok" />
          </View>
        </Card>

        <SizeGrid stock={product.sizes} value={sizes} onChange={setSizes} />
      </ScrollView>

      <Dock>
        <View style={styles.dockRow}>
          <T variant="small" tone="muted">{totals.pairs} đôi</T>
          <Price value={totals.money} variant="heading" tone="bq" />
        </View>
        <Pill
          label={totals.pairs > 0 ? "Thêm vào giỏ" : "Chọn size để đặt"}
          tone="brand"
          disabled={totals.pairs === 0}
          onPress={addToCart}
        />
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x5 },
  // Lề âm kéo băng ảnh ra sát hai mép màn, rồi contentContainer trả lại lề cho
  // ảnh đầu và ảnh cuối — phần còn lại của trang vẫn nằm trong lề chuẩn.
  gallery: { marginHorizontal: -space.screen },
  galleryContent: { gap: space.x3, paddingHorizontal: space.screen },
  head: { gap: space.x1 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.x2 },
  marginCard: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, gap: space.x1 },
  vline: { width: 1, alignSelf: "stretch", backgroundColor: color.line, marginHorizontal: space.x4 },
  dockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

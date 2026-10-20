import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import type { Product } from "@bq/types";
import { vnd } from "@bq/core";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SizeMatrix, type SizeQty } from "@/components/SizeMatrix";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { dealer } = useSession();
  const { upsert, lines } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const existing = lines.find((l) => l.code === code);
  const [sizes, setSizes] = useState<SizeQty>(existing?.sizes ?? {});

  useEffect(() => {
    if (!dealer || !code) return;
    // Lấy từ danh sách theo đại lý để có GIÁ ĐÚNG THEO BẬC; endpoint sản phẩm đơn lẻ
    // không nhận tham số đại lý nên sẽ trả giá sỉ cơ bản.
    void api.products(dealer.code)
      .then((all) => setProduct(all.find((p) => p.code === code) ?? null))
      .catch(() => setProduct(null));
  }, [dealer, code]);

  const totals = useMemo(() => {
    const pairs = Object.values(sizes).reduce((s, n) => s + n, 0);
    return { pairs, money: pairs * (product?.price ?? 0) };
  }, [sizes, product]);

  if (!product) {
    return (
      <View style={styles.center}><ActivityIndicator color={colors.brand[500]} /></View>
    );
  }

  const margin = product.retail - product.price;
  const addToCart = () => {
    upsert(product, sizes);
    router.push("/cart");
  };

  return (
    <Screen
      footer={
        <View style={{ gap: space.sm }}>
          <View style={styles.footerRow}>
            <Text variant="bodySm" color={colors.textMuted}>{totals.pairs} đôi</Text>
            <Text variant="h3" color={colors.brand[500]}>{vnd(totals.money)}</Text>
          </View>
          <Button
            label={totals.pairs > 0 ? "Thêm vào giỏ" : "Chọn size để đặt"}
            icon="cart-outline"
            disabled={totals.pairs === 0}
            onPress={addToCart}
          />
        </View>
      }
    >
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {(product.images?.length ? product.images : [product.image]).map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.photo} contentFit="cover" transition={180} />
        ))}
      </ScrollView>

      <View style={{ gap: space.xs }}>
        <View style={styles.codeRow}>
          <Text variant="caption" color={colors.textFaint}>{product.code}</Text>
          <Badge label={`★ Hạng ${dealer?.tier ?? ""}`} tone="warning" />
        </View>
        <Text variant="h2">{product.name}</Text>
        <View style={styles.priceRow}>
          <Text variant="display" color={colors.brand[500]}>{vnd(product.price)}</Text>
          <Text variant="bodySm" color={colors.textMuted}>/ đôi · giá sỉ</Text>
        </View>
      </View>

      <Card flat style={styles.marginCard}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color={colors.textMuted}>Giá lẻ đề xuất</Text>
          <Text variant="bodyLg" weight="700">{vnd(product.retail)}</Text>
        </View>
        <View style={styles.vline} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color={colors.textMuted}>Lợi nhuận / đôi</Text>
          <Text variant="bodyLg" weight="700" color={colors.success.fg}>{vnd(margin)}</Text>
        </View>
      </Card>

      <SizeMatrix
        stock={product.sizes}
        value={sizes}
        onChange={setSizes}
        unitPrice={product.price}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  gallery: { marginHorizontal: -space.lg },
  photo: { width: 320, height: 260, borderRadius: radius.lg, marginLeft: space.lg, backgroundColor: colors.surfaceSunken },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  marginCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSunken },
  vline: { width: 1, height: 32, backgroundColor: colors.border, marginHorizontal: space.lg },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { totalPairs, vnd } from "@bq/core";
import type { Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { ColorPicker } from "@/components/product/ColorPicker";
import {
  Dock, DOCK_CLEARANCE, EmptyState, IconButton, Num, OfflineBanner, Pill, Price, ProductImage,
  SizeList, StatusTag, StockStamp, T, TextButton, Toast, hhmm, type SizeQty,
} from "@/components/ui";

/** Chi tiết sản phẩm + Size Matrix (SPEC §3.5, ảnh `05-Detail.png`). */
export default function ProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { dealer } = useSession();
  const { lines, upsert, subtotal } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [missing, setMissing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [sizes, setSizes] = useState<SizeQty>({});
  const [colour, setColour] = useState("");
  const [favourite, setFavourite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const inCart = lines.find((l) => l.code === code);

  const load = useCallback(async () => {
    if (!dealer || !code) return;
    try {
      // Không có endpoint một sản phẩm; lọc từ danh mục đã có (`// TODO(api)`).
      const rows = await api.products(dealer.code);
      const found = rows.find((p) => p.code === code) ?? null;
      setProduct(found);
      setMissing(!found);
      setFetchedAt(new Date());
      setOffline(false);
      if (found) setColour((c) => c || (found.colors?.[0] ?? ""));
    } catch {
      setOffline(true);
    }
  }, [dealer, code]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Điền sẵn bảng size theo thứ đã có trong giỏ, chỉ một lần khi mở màn.
  useFocusEffect(
    useCallback(() => {
      setSizes((prev) => (Object.keys(prev).length ? prev : (inCart?.sizes ?? {})));
      // `inCart` đổi tham chiếu mỗi lần giỏ đổi; chỉ cần lần đầu.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]),
  );

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  if (missing) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState
          icon="help-circle-outline"
          title={`Không thấy mẫu ${code}`}
          hint="Mẫu có thể đã ngừng bán. Quay lại danh mục để chọn mẫu khác."
          actionLabel="Về danh mục"
          onActionPress={() => router.replace("/(tabs)/products")}
        />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.brand} />
      </View>
    );
  }

  const pairs = totalPairs(sizes);
  const money = pairs * product.price;
  const margin = product.retail - product.price;
  const cartWithout = subtotal - (inCart ? totalPairs(inCart.sizes) * inCart.unitPrice : 0);
  const left = (dealer?.credit_available ?? 0) - (cartWithout + money);

  const addAll = () => {
    setSizes((prev) => {
      const next = { ...prev };
      for (const [size, stock] of Object.entries(product.sizes)) {
        if (stock <= 0) continue;
        next[size] = Math.min(stock, (next[size] ?? 0) + 1);
      }
      return next;
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: DOCK_CLEARANCE + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ProductImage uri={product.image} shape="hero" aspectRatio={390 / 250} />
          <View style={[styles.heroBtns, { top: insets.top + space.x2 }]} pointerEvents="box-none">
            <IconButton
              icon="chevron-back"
              tone="glass"
              accessibilityLabel="Quay lại"
              onPress={() => router.back()}
            />
            <View style={styles.heroRight}>
              <IconButton
                icon={favourite ? "heart" : "heart-outline"}
                tone="glass"
                accessibilityLabel={favourite ? "Bỏ yêu thích" : "Yêu thích"}
                onPress={() => setFavourite((v) => !v)}
              />
              {/* TODO(api): chưa có link chia sẻ công khai cho mẫu. */}
              <IconButton icon="share-outline" tone="glass" disabled accessibilityLabel="Chia sẻ — chưa khả dụng" />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {offline ? (
            <OfflineBanner at={hhmm(fetchedAt)} retrying={retrying} onRetry={retry} />
          ) : null}

          <View style={styles.codeRow}>
            <Num variant="small" tone="muted">
              {[product.code, product.category].filter(Boolean).join(", ")}
            </Num>
            {dealer ? <StatusTag label={`Giá hạng ${dealer.tier}`} kind="brand" /> : null}
          </View>

          <T variant="title">{product.name}</T>

          <View style={styles.priceRow}>
            <Price value={product.price} suffix="/đôi" variant="amountLg" weight="extrabold" />
            <View style={styles.priceRight}>
              {margin > 0 ? (
                <T variant="small" weight="bold" tone="ok">{`Lãi ${vnd(margin)}/đôi`}</T>
              ) : null}
              <T variant="chip" tone="muted">{`Giá lẻ ${vnd(product.retail)}`}</T>
            </View>
          </View>

          <View style={styles.colourRow}>
            <ColorPicker
              colors={product.colors ?? []}
              value={colour}
              onChange={setColour}
              variant="pill"
              style={styles.colourList}
            />
            <TextButton label="+1 mỗi size" underline onPress={addAll} />
          </View>

          <T variant="cardTitle" weight="bold">Chọn size và số lượng</T>
          <StockStamp fetchedAt={fetchedAt} onRefresh={retry} />
          <SizeList
            stock={product.sizes}
            value={sizes}
            onChange={setSizes}
            onExceedStock={(s, stock) => setToast(`Size ${s} chỉ còn ${stock} đôi`)}
          />
        </View>
      </ScrollView>

      <Dock
        left={{
          label: `${pairs} đôi đã chọn`,
          value: <Price value={money} variant="amountSm" weight="extrabold" />,
        }}
        right={{
          label: left < 0 ? "Vượt hạn mức" : "Hạn mức còn",
          value: (
            <Num variant="label" weight="semibold" tone={left < 0 ? "danger" : "ink"}>
              {vnd(Math.abs(left))}
            </Num>
          ),
        }}
      >
        <Pill
          label={inCart ? "Cập nhật giỏ hàng" : "Thêm vào giỏ"}
          disabled={pairs === 0}
          leading={<Ionicons name="bag-outline" size={20} color={color.white} />}
          style={styles.flex}
          onPress={() => {
            upsert(product, sizes);
            setToast(inCart ? `Đã cập nhật ${pairs} đôi` : `Đã thêm ${pairs} đôi`);
          }}
        />
      </Dock>

      {toast ? (
        <Toast
          message={toast}
          actionLabel="Xem giỏ"
          onActionPress={() => { setToast(null); router.push("/cart"); }}
          onHide={() => setToast(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  center: { justifyContent: "center", paddingHorizontal: space.screen },
  heroBtns: {
    position: "absolute", left: space.screen, right: space.screen,
    flexDirection: "row", justifyContent: "space-between",
  },
  heroRight: { flexDirection: "row", gap: space.x2 },
  body: { paddingHorizontal: space.screen, paddingTop: space.x4, gap: space.x3 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x3 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.x3 },
  priceRight: { alignItems: "flex-end", gap: 1 },
  colourRow: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  colourList: { flex: 1 },
  flex: { flex: 1 },
});

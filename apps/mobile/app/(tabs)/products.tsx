import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { Product } from "@bq/types";
import { totalPairs } from "@bq/core";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useFavourites } from "@/lib/favourites";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { QuickAddSheet } from "@/components/product/QuickAddSheet";
import {
  BottomSheet, Chip, EmptyState, IconButton, OfflineBanner, RadioCard, ScreenHeader,
  SearchField, Skeleton, Switch, T, TAB_BAR_CLEARANCE, Toast, hhmm, type SizeQty,
} from "@/components/ui";

const ALL = "Tất cả";

/**
 * Cách sắp xếp. "Bán chạy" KHÔNG có xếp hạng từ API (`// TODO(api)`) nên nó chỉ
 * là thứ tự backend trả về — đặt tên đúng như thiết kế nhưng không hứa hơn thế.
 */
const SORTS = [
  { value: "default", label: "Bán chạy" },
  { value: "priceAsc", label: "Giá thấp → cao" },
  { value: "priceDesc", label: "Giá cao → thấp" },
  { value: "marginDesc", label: "Lãi cao nhất" },
] as const;
type SortKey = (typeof SORTS)[number]["value"];

/** Màn Sản phẩm (SPEC §3.3, ảnh `03-Products.png`). */
export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const { lines, upsert, subtotal } = useCart();

  const [all, setAll] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [offline, setOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("default");
  const [size, setSize] = useState<string | null>(null);
  // Mặc định BẬT, theo ảnh thiết kế: đại lý mở danh mục để đặt hàng, mẫu hết
  // hàng chỉ làm nhiễu. Tắt được ngay trên hàng lọc nhanh.
  const [inStockOnly, setInStockOnly] = useState(true);

  const [sheet, setSheet] = useState<"sort" | "size" | "filter" | null>(null);
  const [quickAdd, setQuickAdd] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { codes: favourites, toggle: toggleFavourite } = useFavourites();
  /** Chip "Đã lưu" — lọc tại chỗ thay vì mở một màn riêng. */
  const [savedOnly, setSavedOnly] = useState(false);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      const [p, c] = await Promise.all([api.products(dealer.code), api.categories()]);
      setAll(p);
      setCategories(c);
      setFetchedAt(new Date());
      setOffline(false);
    } catch {
      // Giữ nguyên dữ liệu cũ và báo rõ nó cũ từ lúc nào (SPEC §3.15) — xoá đi
      // rồi hiện màn trắng thì đại lý mất luôn thứ đang xem.
      setOffline(true);
      setAll((prev) => prev ?? []);
    }
  }, [dealer]);

  /**
   * Mất mạng mà CHƯA kịp tải được gì lần nào (mở lạnh khi không có sóng) thì
   * không có "dữ liệu cũ" nào để hiện. Băng "đang hiện dữ liệu lúc HH:mm" khi
   * đó là lời hứa sai — phải báo không tải được và mời thử lại.
   */
  const neverLoaded = offline && (all?.length ?? 0) === 0;

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  const sizesAvailable = useMemo(() => {
    const set = new Set<string>();
    for (const p of all ?? []) for (const s of Object.keys(p.sizes)) set.add(s);
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [all]);

  const shown = useMemo(() => {
    let rows = all ?? [];
    if (category !== ALL) rows = rows.filter((p) => p.category === category);
    if (size) rows = rows.filter((p) => (p.sizes[size] ?? 0) > 0);
    if (inStockOnly) rows = rows.filter((p) => Object.values(p.sizes).some((n) => n > 0));
    if (savedOnly) rows = rows.filter((p) => favourites.has(p.code));
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle),
      );
    }
    const by: Record<SortKey, (a: Product, b: Product) => number> = {
      default: () => 0,
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      marginDesc: (a, b) => b.retail - b.price - (a.retail - a.price),
    };
    return sort === "default" ? rows : [...rows].sort(by[sort]);
  }, [all, category, size, inStockOnly, savedOnly, favourites, q, sort]);

  const cartSizesOf = (code: string): SizeQty =>
    lines.find((l) => l.code === code)?.sizes ?? {};
  const cartMoneyOf = (code: string): number => {
    const line = lines.find((l) => l.code === code);
    return line ? totalPairs(line.sizes) * line.unitPrice : 0;
  };

  const addToCart = (product: Product, sizes: SizeQty) => {
    upsert(product, sizes);
    setQuickAdd(null);
    setToast(`Đã thêm ${totalPairs(sizes)} đôi`);
  };

  const clearFilters = () => {
    setSize(null);
    setInStockOnly(true);
    setSavedOnly(false);
    setCategory(ALL);
    setSort("default");
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: TAB_BAR_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.pad}>
          <ScreenHeader
            title="Sản phẩm"
            caption={all === null || neverLoaded ? " " : `${all.length} mẫu đang bán`}
            trailing={
              <IconButton
                icon="bag-outline"
                badge={lines.length}
                accessibilityLabel="Giỏ hàng"
                onPress={() => router.push("/cart")}
              />
            }
          />
        </View>

        {/* Khối dính: tìm kiếm + danh mục + lọc nhanh. Cuộn lưới sản phẩm mà
            mất luôn bộ lọc thì không biết mình đang xem tập nào. */}
        <View style={styles.sticky}>
          <View style={[styles.pad, styles.searchRow]}>
            {/* Gõ rồi bấm phím tìm: sang màn tìm kiếm đầy đủ (SPEC §3.16), nơi
                có gợi ý mã gần giống và nút gọi Sale. Gõ không bấm gì thì lọc
                ngay tại chỗ. */}
            <SearchField
              value={q}
              onChangeText={setQ}
              placeholder="Tìm tên hoặc mã mẫu"
              onSubmitEditing={() => router.push({
                pathname: "/search",
                params: { q, ...(size ? { size } : null) },
              })}
              style={styles.search}
            />
            <IconButton
              icon="options-outline"
              accessibilityLabel="Bộ lọc nâng cao"
              onPress={() => setSheet("filter")}
            />
            {/* TODO(api): nút quét mã vạch ĐÃ GỠ. Nó cần module máy quét và API
                tra theo mã vạch, chưa có cái nào — một nút mờ thường trực ở
                header chỉ là rác chiếm chỗ. Dựng lại khi có đủ hai thứ đó. */}
          </View>

          <View style={styles.chipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {[ALL, ...categories].map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={c === category}
                  onPress={() => setCategory(c)}
                />
              ))}
            </ScrollView>
            {/* Dải mờ dần ở mép phải: báo còn danh mục nữa bên phải. */}
            <LinearGradient
              colors={[color.whiteA(0), color.canvas]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fade}
              pointerEvents="none"
            />
          </View>

          {/* Cuộn ngang như hàng danh mục ngay trên: ba chip + công tắc "Còn
              hàng" rộng hơn bề ngang máy ở khổ 393. Hàng đứng yên thì chip cuối
              bị mép màn cắt mất. */}
          <View style={styles.chipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.pad, styles.filterRow]}
            >
            <Chip
              label={SORTS.find((s) => s.value === sort)?.label ?? "Bán chạy"}
              variant="filter"
              dropdown
              onPress={() => setSheet("sort")}
            />
            {size ? (
              <Chip
                label={`Size ${size}`}
                variant="applied"
                onPress={() => setSheet("size")}
                onRemove={() => setSize(null)}
              />
            ) : (
              <Chip label="Size" variant="filter" dropdown onPress={() => setSheet("size")} />
            )}
            <View style={styles.stock}>
              <T variant="label" weight="regular">Còn hàng</T>
              <Switch
                value={inStockOnly}
                onValueChange={setInStockOnly}
                accessibilityLabel="Chỉ hiện mẫu còn hàng"
              />
            </View>
            <Chip
              label={favourites.size > 0 ? `Đã lưu (${favourites.size})` : "Đã lưu"}
              variant={savedOnly ? "applied" : "filter"}
              onPress={() => setSavedOnly((v) => !v)}
              {...(savedOnly ? { onRemove: () => setSavedOnly(false) } : null)}
            />
            </ScrollView>
            <LinearGradient
              colors={[color.whiteA(0), color.canvas]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fade}
              pointerEvents="none"
            />
          </View>
        </View>

        <View style={styles.pad}>
          {offline && !neverLoaded ? (
            <OfflineBanner
              at={hhmm(fetchedAt)}
              retrying={retrying}
              onRetry={retry}
              style={styles.banner}
            />
          ) : null}

          {neverLoaded ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Không tải được danh mục"
              hint="Kiểm tra kết nối mạng rồi thử lại. Giỏ hàng và đơn nháp vẫn giữ nguyên."
              actionLabel="Thử lại"
              onActionPress={retry}
            />
          ) : all === null ? (
            <View style={styles.grid}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.cell}>
                  <Skeleton height={170} shape="card" />
                  <Skeleton height={14} />
                  <Skeleton height={14} width="60%" />
                </View>
              ))}
            </View>
          ) : shown.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title={q.trim() ? `Không tìm thấy “${q.trim()}”` : "Bộ lọc không khớp mẫu nào"}
              hint={
                q.trim()
                  ? "Kiểm tra lại mã, hoặc bỏ bớt bộ lọc để mở rộng kết quả."
                  : "Bỏ bớt bộ lọc để thấy nhiều mẫu hơn."
              }
              actionLabel="Bỏ bộ lọc"
              onActionPress={() => { clearFilters(); setQ(""); }}
            />
          ) : (
            <View style={[styles.grid, offline && styles.gridStale]}>
              {shown.map((p) => (
                <View key={p.code} style={styles.cell}>
                  <ProductCard
                    product={p}
                    // SPEC §3.15: mất mạng thì dòng tình trạng size đổi thành
                    // mốc thời gian, vì tình trạng đó đã không còn đáng tin.
                    stockNote={offline ? `Tồn kho lúc ${hhmm(fetchedAt)}` : undefined}
                    favourite={favourites.has(p.code)}
                    onToggleFavourite={() => toggleFavourite(p.code)}
                    onPress={() => router.push(`/product/${p.code}`)}
                    onQuickAdd={() => setQuickAdd(p)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={sheet === "sort"}
        onClose={() => setSheet(null)}
        title="Sắp xếp"
      >
        <View style={styles.options}>
          {SORTS.map((s) => (
            <RadioCard
              key={s.value}
              title={s.label}
              selected={s.value === sort}
              onPress={() => { setSort(s.value); setSheet(null); }}
            />
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={sheet === "size"}
        onClose={() => setSheet(null)}
        title="Lọc theo size"
      >
        <View style={styles.sizeGrid}>
          <Chip
            label="Mọi size"
            selected={size === null}
            onPress={() => { setSize(null); setSheet(null); }}
          />
          {sizesAvailable.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={s === size}
              onPress={() => { setSize(s); setSheet(null); }}
            />
          ))}
        </View>
      </BottomSheet>

      {/* SPEC vẽ nút "bộ lọc nâng cao" nhưng KHÔNG mô tả sheet của nó. Gom đúng
          ba bộ lọc đang có thay vì bịa thêm tiêu chí không có dữ liệu. */}
      <BottomSheet
        visible={sheet === "filter"}
        onClose={() => setSheet(null)}
        title="Bộ lọc"
      >
        <View style={styles.options}>
          <T variant="label" weight="semibold">Sắp xếp</T>
          {SORTS.map((s) => (
            <RadioCard
              key={s.value}
              title={s.label}
              selected={s.value === sort}
              onPress={() => setSort(s.value)}
            />
          ))}
          <View style={styles.stockRow}>
            <T variant="label" weight="semibold">Chỉ hiện mẫu còn hàng</T>
            <Switch
              value={inStockOnly}
              onValueChange={setInStockOnly}
              accessibilityLabel="Chỉ hiện mẫu còn hàng"
            />
          </View>
        </View>
      </BottomSheet>

      <QuickAddSheet
        product={quickAdd}
        onClose={() => setQuickAdd(null)}
        onAdd={addToCart}
        creditAvailable={dealer?.credit_available ?? 0}
        cartSubtotalWithout={subtotal - cartMoneyOf(quickAdd?.code ?? "")}
        existing={cartSizesOf(quickAdd?.code ?? "")}
        stockFetchedAt={fetchedAt}
        onRefreshStock={retry}
        onExceedStock={(s, stock) => setToast(`Size ${s} chỉ còn ${stock} đôi`)}
      />

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
  body: { gap: space.x4 },
  pad: { paddingHorizontal: space.screen },
  sticky: { backgroundColor: color.canvas, gap: space.x3, paddingBottom: space.x3 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  search: { flex: 1 },
  chipsWrap: { position: "relative" },
  chips: { gap: space.x2, paddingHorizontal: space.screen },
  fade: { position: "absolute", right: 0, top: 0, bottom: 0, width: 40 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  stock: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  banner: { marginBottom: space.x4 },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: space.x3, rowGap: space.x5 },
  gridStale: { opacity: 0.85 },
  // `48%` chứ không `flex: 1`: hàng cuối còn một thẻ thì `flex` kéo nó rộng gấp đôi.
  cell: { width: "48%", gap: space.x2 },
  options: { gap: space.x3, paddingBottom: space.x4 },
  stockRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: space.x2,
  },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.x2, paddingBottom: space.x6 },
});

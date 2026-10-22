import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Product } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { Chip, EmptyState, ProductTile, SearchField, T } from "@/components/ui";

const ALL = "Tất cả";

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    if (!dealer) return;
    void api.categories().then((c) => setCategories([ALL, ...c])).catch(() => setCategories([ALL]));
  }, [dealer]);

  const load = useCallback(async () => {
    if (!dealer) return;
    setProducts(null);
    try {
      setProducts(await api.products(dealer.code, category === ALL ? undefined : category));
    } catch {
      setProducts([]);
    }
  }, [dealer, category]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO(BQ-debt-1): đổi sang useSyncExternalStore kéo theo viết lại luồng load() dùng chung với onRefresh
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (inStockOnly && Object.values(p.sizes).every((n) => n <= 0)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    });
  }, [products, query, inStockOnly]);

  const clearFilters = () => {
    setQuery("");
    setCategory(ALL);
    setInStockOnly(false);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + space.x3 }]}>
        <SearchField value={query} onChangeText={setQuery} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categories.map((c) => (
            <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />
          ))}
          <Chip
            label="Còn hàng"
            active={inStockOnly}
            onPress={() => setInStockOnly((v) => !v)}
          />
        </ScrollView>
      </View>

      {products === null ? (
        <View style={styles.center}><ActivityIndicator color={color.bq} /></View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Không tìm thấy mẫu phù hợp"
          hint="Thử bỏ bớt bộ lọc hoặc tìm bằng mã sản phẩm."
          actionLabel="Xoá bộ lọc"
          onActionPress={clearFilters}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <T variant="micro" tone="muted">{visible.length} mẫu</T>
          <View style={styles.grid}>
            {visible.map((p) => (
              <ProductTile
                key={p.code}
                product={p}
                onPress={() => router.push(`/product/${p.code}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  header: {
    backgroundColor: color.canvas,
    paddingHorizontal: space.screen,
    paddingBottom: space.x3,
    gap: space.x3,
  },
  chips: { gap: space.x2, paddingRight: space.screen },
  body: { padding: space.screen, paddingTop: space.x2, gap: space.x3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.x3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

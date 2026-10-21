import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Product } from "@bq/types";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm mẫu giày hoặc mã sản phẩm"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            returnKeyType="search"
            accessibilityLabel="Tìm sản phẩm"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

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
            icon="checkmark-circle-outline"
            onPress={() => setInStockOnly((v) => !v)}
          />
        </ScrollView>
      </View>

      {products === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Không tìm thấy mẫu phù hợp"
          hint="Thử bỏ bớt bộ lọc hoặc tìm bằng mã sản phẩm."
          action={{ label: "Xoá bộ lọc", onPress: () => { setQuery(""); setCategory(ALL); setInStockOnly(false); } }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          <Text variant="caption" color={colors.textMuted} style={{ width: "100%" }}>
            {visible.length} mẫu
          </Text>
          {visible.map((p) => (
            <ProductCard key={p.code} product={p} onPress={() => router.push(`/product/${p.code}`)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Chip({
  label, active, onPress, icon,
}: { label: string; active: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={active ? colors.textOnBrand : colors.slate[600]} />
      ) : null}
      <Text variant="label" color={active ? colors.textOnBrand : colors.slate[600]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 46, paddingHorizontal: space.lg,
    borderRadius: radius.pill, backgroundColor: colors.surfaceSunken,
  },
  input: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: colors.text },
  chips: { gap: space.sm, paddingRight: space.lg },
  chip: {
    flexDirection: "row", alignItems: "center", gap: space.xs,
    paddingHorizontal: space.lg, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: colors.surfaceSunken,
  },
  chipActive: { backgroundColor: colors.brand[500] },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: space.md, padding: space.lg,
    justifyContent: "space-between",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

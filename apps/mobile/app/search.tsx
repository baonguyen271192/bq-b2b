import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { totalPairs } from "@bq/core";
import type { Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSearchHistory } from "@/lib/search-history";
import { useSession } from "@/lib/session";
import { supportContact, telUrl } from "@/lib/support";
import { color, space } from "@/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { QuickAddSheet } from "@/components/product/QuickAddSheet";
import {
  Card, Chip, EmptyState, IconButton, Pill, Price, ProductImage, SearchField, T,
  TextButton, Toast, type SizeQty,
} from "@/components/ui";

/** Số mã gợi ý tối đa trong card "Mã gần giống" (SPEC §3.16). */
const SIMILAR_LIMIT = 3;

/**
 * Khoảng cách Levenshtein, dùng để gợi ý "mã gần giống".
 *
 * Tự viết thay vì thêm thư viện: chỉ so vài trăm mã ngắn, và một phụ thuộc mới
 * cho đúng một hàm 15 dòng là không đáng. Giới hạn 3 phép sửa — xa hơn thế thì
 * không còn là "gõ nhầm" mà là mã khác hẳn.
 */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * Màn tìm kiếm, bao gồm trạng thái "Tìm không ra" (SPEC §3.16, ảnh `16-NoResults.png`).
 *
 * Tách khỏi tab Sản phẩm vì nó có header riêng (back + ô tìm kiếm chiếm cả hàng)
 * và vì khi không ra kết quả, màn này phải đưa lối thoát — gợi ý mã gần giống và
 * gọi người hỗ trợ — chứ không chỉ báo "không có gì".
 */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const { q: initialQ, size: initialSize } = useLocalSearchParams<{ q?: string; size?: string }>();

  const { lines, upsert, subtotal } = useCart();
  const { recent, remember, clear: clearHistory } = useSearchHistory();

  const [all, setAll] = useState<Product[] | null>(null);
  const [q, setQ] = useState(initialQ ?? "");
  const [size, setSize] = useState<string | null>(initialSize ?? null);
  const [quickAdd, setQuickAdd] = useState<Product | null>(null);
  const [fetchedAt, setFetchedAt] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      setAll(await api.products(dealer.code));
      setFetchedAt(new Date());
    } catch {
      setAll([]);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const support = supportContact(dealer);
  const needle = q.trim().toLowerCase();

  const hits = useMemo(() => {
    let rows = all ?? [];
    if (size) rows = rows.filter((p) => (p.sizes[size] ?? 0) > 0);
    if (!needle) return rows;
    return rows.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle),
    );
  }, [all, needle, size]);

  /** Mã gần giống: chỉ tính khi đã gõ gì đó và không ra kết quả nào. */
  const similar = useMemo(() => {
    if (!needle || hits.length > 0) return [];
    return (all ?? [])
      .map((p) => ({ p, d: editDistance(needle, p.code.toLowerCase()) }))
      .filter((x) => x.d <= 3)
      .sort((a, b) => a.d - b.d)
      .slice(0, SIMILAR_LIMIT)
      .map((x) => x.p);
  }, [all, needle, hits.length]);

  const cartSizesOf = (code: string): SizeQty =>
    lines.find((l) => l.code === code)?.sizes ?? {};
  const cartMoneyOf = (code: string): number => {
    const line = lines.find((l) => l.code === code);
    return line ? totalPairs(line.sizes) * line.unitPrice : 0;
  };

  const openProduct = (code: string) => {
    remember(q);
    router.push(`/product/${code}`);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x3 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <IconButton icon="chevron-back" accessibilityLabel="Quay lại" onPress={() => router.back()} />
        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder="Tìm tên hoặc mã mẫu"
          focused
          autoFocus
          onSubmitEditing={() => remember(q)}
          style={styles.search}
        />
      </View>

      {size ? (
        <View style={styles.filters}>
          <T variant="small" tone="muted">Đang lọc:</T>
          <Chip
            label={`Size ${size}`}
            variant="applied"
            onRemove={() => setSize(null)}
            onPress={() => setSize(null)}
          />
        </View>
      ) : null}

      {/* Lịch sử: chỉ hiện khi CHƯA gõ gì. Đang gõ mà vẫn chèn một khối ở trên
          kết quả thì đẩy kết quả xuống dưới màn. */}
      {!needle && recent.length > 0 ? (
        <View style={styles.history}>
          <View style={styles.historyHead}>
            <T variant="small" weight="semibold" tone="muted">Tìm gần đây</T>
            <TextButton label="Xoá" onPress={clearHistory} />
          </View>
          <View style={styles.historyChips}>
            {recent.map((term) => (
              <Chip key={term} label={term} variant="filter" onPress={() => setQ(term)} />
            ))}
          </View>
        </View>
      ) : null}

      {hits.length > 0 ? (
        <>
          <T variant="small" tone="muted">
            {`${hits.length} kết quả${needle ? ` cho “${q.trim()}”` : ""}`}
          </T>
          <View style={styles.grid}>
            {hits.map((p) => (
              <View key={p.code} style={styles.cell}>
                <ProductCard
                  product={p}
                  onPress={() => openProduct(p.code)}
                  onQuickAdd={() => { remember(q); setQuickAdd(p); }}
                />
              </View>
            ))}
          </View>
        </>
      ) : needle ? (
        <>
          <EmptyState
            icon="search-outline"
            title={`Không tìm thấy “${q.trim()}”`}
            hint={
              size
                ? `Kiểm tra lại mã, hoặc bỏ bộ lọc size ${size} để mở rộng kết quả.`
                : "Kiểm tra lại mã, hoặc tìm bằng tên mẫu thay vì mã."
            }
          />
          <View style={styles.actions}>
            <Pill
              label="Bỏ bộ lọc"
              tone="outline"
              size={48}
              style={styles.flex}
              onPress={() => { setSize(null); setQ(""); }}
            />
            {support ? (
              <Pill
                label={support.isSalesRep ? "Hỏi Sale" : "Gọi tổng đài BQ"}
                tone="ink"
                size={48}
                style={styles.flex}
                leading={<Ionicons name="call-outline" size={20} color={color.white} />}
                onPress={() => void Linking.openURL(telUrl(support.phone))}
              />
            ) : null}
          </View>

          {similar.length > 0 ? (
            <Card>
              <T variant="cardTitle" weight="bold" style={styles.similarHead}>Mã gần giống</T>
              {similar.map((p, i) => (
                <View
                  key={p.code}
                  style={[styles.similar, i < similar.length - 1 && styles.similarDivider]}
                >
                  <ProductImage uri={p.image} style={styles.thumb} />
                  <View style={styles.similarText}>
                    <T variant="chip" tone="muted">{p.code}</T>
                    <T variant="label" weight="semibold" numberOfLines={2}>{p.name}</T>
                  </View>
                  <Price value={p.price} variant="bodyStrong" weight="bold" />
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      <QuickAddSheet
        product={quickAdd}
        onClose={() => setQuickAdd(null)}
        onAdd={(product, sizes) => {
          upsert(product, sizes);
          setQuickAdd(null);
          setToast(`Đã thêm ${totalPairs(sizes)} đôi`);
        }}
        creditAvailable={dealer?.credit_available ?? 0}
        cartSubtotalWithout={subtotal - cartMoneyOf(quickAdd?.code ?? "")}
        existing={cartSizesOf(quickAdd?.code ?? "")}
        stockFetchedAt={fetchedAt}
        onRefreshStock={load}
        onExceedStock={(sz, stock) => setToast(`Size ${sz} chỉ còn ${stock} đôi`)}
      />

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, paddingBottom: space.x12, gap: space.x4 },
  header: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  search: { flex: 1 },
  filters: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  history: { gap: space.x2 },
  historyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyChips: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: space.x3, rowGap: space.x5 },
  cell: { width: "48%", gap: space.x2 },
  actions: { flexDirection: "row", gap: space.x3 },
  flex: { flex: 1 },
  similarHead: { marginBottom: space.x2 },
  similar: { flexDirection: "row", alignItems: "center", gap: space.x3, paddingVertical: space.x3 },
  similarDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  thumb: { width: 52 },
  similarText: { flex: 1, gap: 1 },
});

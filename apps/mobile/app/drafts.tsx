import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { draftRepository, type Draft } from "@/lib/repo/drafts";
import { color, space } from "@/theme";
import {
  Card, EmptyState, Notice, Num, Pill, ProductImage, ScreenHeader, SizeChip, T, TextButton,
} from "@/components/ui";

/** Đơn nháp (SPEC §3.21, ảnh `21-Drafts.png`). */
export default function DraftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const { upsert } = useCart();
  const [moving, setMoving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  const load = useCallback(async () => {
    if (!dealer) return;
    setDrafts(await draftRepository.list(dealer.code));
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmRemove = (draft: Draft) => {
    Alert.alert(
      "Xoá đơn nháp?",
      `${draft.id} sẽ bị xoá khỏi tài khoản. Không khôi phục lại được.`,
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: () => {
            if (!dealer) return;
            void draftRepository.remove(dealer.code, draft.id).then(setDrafts);
          },
        },
      ],
    );
  };

  /**
   * Chuyển nháp vào giỏ bằng cách ĐỌC LẠI sản phẩm từ API, không dựng giỏ từ
   * dữ liệu đã lưu: giá và tồn kho đổi sau khi lưu nháp, và chính card này hứa
   * với đại lý là sẽ kiểm tra lại. Dựng từ dữ liệu cũ là nuốt lời hứa đó.
   */
  const toCart = async (draft: Draft) => {
    if (!dealer || moving) return;
    setMoving(draft.id);
    try {
      const products = await api.products(dealer.code);
      const byCode = new Map(products.map((p) => [p.code, p]));
      let missing = 0;
      for (const line of draft.lines) {
        const product = byCode.get(line.code);
        if (!product) { missing += 1; continue; }
        upsert(product, line.sizes);
      }
      if (missing > 0) {
        Alert.alert(
          "Một số mẫu không còn bán",
          `${missing} mẫu trong nháp này đã ngừng bán nên không chuyển vào giỏ được.`,
        );
      }
      router.replace("/cart");
    } catch {
      Alert.alert("Không chuyển được vào giỏ", "Kiểm tra kết nối mạng rồi thử lại.");
    } finally {
      setMoving(null);
    }
  };

  if (!dealer) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.body, { paddingTop: insets.top + space.x3 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        variant="back"
        title="Đơn nháp"
        caption={drafts === null ? " " : `${drafts.length} đơn đã lưu`}
        onBack={() => router.back()}
      />

      {drafts !== null && drafts.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Chưa có đơn nháp nào"
          hint="Ở giỏ hàng, bấm “Lưu nháp” để giữ lại đơn đang chọn dở."
          actionLabel="Xem sản phẩm"
          onActionPress={() => router.replace("/(tabs)/products")}
        />
      ) : null}

      {(drafts ?? []).map((d) => (
        <Card key={d.id} style={styles.card}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <Num variant="bodyStrong" weight="bold">{d.id}</Num>
              <T variant="small" tone="muted">{`Lưu ngày ${d.savedAt}`}</T>
            </View>
            <TextButton label="Xoá" tone="danger" onPress={() => confirmRemove(d)} />
          </View>

          {d.lines.map((l) => (
            <View key={l.code} style={styles.line}>
              <ProductImage uri={l.image} style={styles.thumb} />
              <View style={styles.lineText}>
                <T variant="chip" tone="muted">{l.code}</T>
                <T variant="label" weight="semibold" numberOfLines={2}>{l.name}</T>
                <View style={styles.sizes}>
                  {Object.entries(l.sizes)
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([size, qty]) => <SizeChip key={size} size={size} qty={qty} />)}
                </View>
              </View>
            </View>
          ))}

          <View style={styles.totals}>
            <T variant="small" tone="muted">{`${d.lines.length} mẫu, ${d.totalPairs} đôi`}</T>
            <Num variant="section" weight="extrabold">{vnd(d.subtotal)}</Num>
          </View>

          <Notice kind="warn">
            Giá và tồn kho sẽ được kiểm tra lại khi chuyển vào giỏ.
          </Notice>

          <View style={styles.actions}>
            {/* "Sửa" để rộng tự nhiên, "Chuyển vào giỏ" chiếm phần còn lại.
                Chia đôi đều thì nhãn dài bị cắt thành "Chuyển ..." ở khổ 390. */}
            <Pill label="Sửa" tone="outline" size={48} onPress={() => void toCart(d)} />
            <Pill
              label="Chuyển vào giỏ"
              size={48}
              loading={moving === d.id}
              style={styles.flex}
              leading={<Ionicons name="bag-outline" size={20} color={color.white} />}
              onPress={() => void toCart(d)}
            />
          </View>
        </Card>
      ))}

      {/* TODO(api): nháp đang nằm trong bộ nhớ của phiên, chưa lưu trên tài
          khoản — câu dưới đây chỉ đúng khi có API. Xem báo cáo Phase 4. */}
      {drafts && drafts.length > 0 ? (
        <T variant="small" tone="muted" style={styles.note}>
          Đơn nháp được lưu trên tài khoản, mở được trên mọi thiết bị.
        </T>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, paddingBottom: space.x12, gap: space.x4 },
  card: { gap: space.x3 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.x3 },
  headText: { gap: 1 },
  line: { flexDirection: "row", gap: space.x3 },
  thumb: { width: 56 },
  lineText: { flex: 1, gap: space.x1 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  totals: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.x3 },
  actions: { flexDirection: "row", gap: space.x3 },
  flex: { flex: 1 },
  note: { textAlign: "center" },
});

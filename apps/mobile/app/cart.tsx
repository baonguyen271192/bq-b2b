import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import {
  CartLineCard, Dock, DOCK_CLEARANCE, EmptyState, Notice, Pill, Price, StatusTag, T,
} from "@/components/ui";
import { vnd } from "@bq/core";

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lines, subtotal, totalPairs, remove } = useCart();
  const { dealer } = useSession();

  if (lines.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="cart-outline"
          title="Giỏ hàng trống"
          hint="Chọn mẫu và đặt số lượng theo bảng size để bắt đầu đơn sỉ."
          actionLabel="Xem sản phẩm"
          onActionPress={() => router.replace("/(tabs)/products")}
        />
      </View>
    );
  }

  const available = dealer ? dealer.credit_available : 0;
  const overLimit = subtotal > available;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: DOCK_CLEARANCE + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {overLimit ? (
          <Notice kind="warn">
            {`Đơn vượt hạn mức khả dụng (${vnd(available)}). Bạn vẫn đặt được, đơn sẽ chờ Sale duyệt trước khi xử lý.`}
          </Notice>
        ) : null}

        {lines.map((line) => (
          <CartLineCard
            key={line.code}
            name={line.name}
            image={line.image}
            unitPrice={line.unitPrice}
            sizes={line.sizes}
            onRemove={() => remove(line.code)}
            onEdit={() => router.push(`/product/${line.code}`)}
          />
        ))}
      </ScrollView>

      <Dock>
        <View style={styles.totalRow}>
          <View>
            <T variant="chip" tone="muted">{totalPairs} đôi · {lines.length} mã</T>
            <Price value={subtotal} variant="title" />
          </View>
          {overLimit ? <StatusTag label="Vượt hạn mức" kind="warn" /> : null}
        </View>
        <Pill
          label={overLimit ? "Gửi đơn chờ duyệt" : "Tiếp tục đặt hàng"}
          tone="brand"
          onPress={() => router.push("/checkout")}
        />
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x3 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

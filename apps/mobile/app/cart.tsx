import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { vnd } from "@bq/core";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { pairsOf, useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

export default function CartScreen() {
  const router = useRouter();
  const { lines, subtotal, totalPairs, remove } = useCart();
  const { dealer } = useSession();

  if (lines.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="cart-outline"
          title="Giỏ hàng trống"
          hint="Chọn mẫu và đặt số lượng theo bảng size để bắt đầu đơn sỉ."
          action={{ label: "Xem sản phẩm", onPress: () => router.replace("/(tabs)/products") }}
        />
      </Screen>
    );
  }

  const available = dealer ? dealer.credit_available : 0;
  const overLimit = subtotal > available;

  return (
    <Screen
      footer={
        <View style={{ gap: space.md }}>
          <View style={styles.totalRow}>
            <View>
              <Text variant="caption" color={colors.textMuted}>{totalPairs} đôi · {lines.length} mã</Text>
              <Text variant="h2">{vnd(subtotal)}</Text>
            </View>
            {overLimit ? (
              <View style={styles.warn}>
                <Ionicons name="alert-circle" size={16} color={colors.warning.fg} />
                <Text variant="caption" weight="600" color={colors.warning.fg}>Vượt hạn mức</Text>
              </View>
            ) : null}
          </View>
          <Button
            label={overLimit ? "Gửi đơn chờ duyệt" : "Tiếp tục đặt hàng"}
            onPress={() => router.push("/checkout")}
          />
        </View>
      }
    >
      {overLimit ? (
        <Card flat style={styles.notice}>
          <Ionicons name="information-circle" size={20} color={colors.warning.fg} />
          <Text variant="bodySm" color={colors.warning.fg} style={{ flex: 1 }}>
            Đơn vượt hạn mức khả dụng ({vnd(available)}). Bạn vẫn đặt được, đơn sẽ chờ
            Sale duyệt trước khi xử lý.
          </Text>
        </Card>
      ) : null}

      {lines.map((line) => (
        <Card key={line.code} padded={false} style={{ overflow: "hidden" }}>
          <View style={styles.line}>
            <Image source={{ uri: line.image }} style={styles.thumb} contentFit="cover" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodySm" weight="600" numberOfLines={2}>{line.name}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {vnd(line.unitPrice)} × {pairsOf(line)} đôi
              </Text>
              <Text variant="bodySm" weight="700" color={colors.brand[500]}>
                {vnd(line.unitPrice * pairsOf(line))}
              </Text>
            </View>
            <Pressable onPress={() => remove(line.code)} hitSlop={10} accessibilityLabel="Xoá khỏi giỏ">
              <Ionicons name="trash-outline" size={19} color={colors.textFaint} />
            </Pressable>
          </View>

          <View style={styles.sizes}>
            {Object.entries(line.sizes).sort((a, b) => Number(a[0]) - Number(b[0])).map(([size, qty]) => (
              <View key={size} style={styles.sizeTag}>
                <Text variant="caption" weight="700">{size}</Text>
                <Text variant="caption" color={colors.textMuted}>×{qty}</Text>
              </View>
            ))}
            <Pressable
              onPress={() => router.push(`/product/${line.code}`)}
              style={[styles.sizeTag, styles.editTag]}
            >
              <Ionicons name="create-outline" size={13} color={colors.brand[500]} />
              <Text variant="caption" weight="600" color={colors.brand[500]}>Sửa</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row", gap: space.md, alignItems: "flex-start",
    backgroundColor: colors.warning.bg, borderColor: colors.warning.border,
  },
  line: { flexDirection: "row", gap: space.md, padding: space.lg, alignItems: "flex-start" },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  sizes: {
    flexDirection: "row", flexWrap: "wrap", gap: space.sm,
    paddingHorizontal: space.lg, paddingBottom: space.lg,
  },
  sizeTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: space.md, paddingVertical: 5,
    borderRadius: radius.sm, backgroundColor: colors.surfaceSunken,
  },
  editTag: { backgroundColor: colors.brand.tint },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  warn: {
    flexDirection: "row", alignItems: "center", gap: space.xs,
    paddingHorizontal: space.md, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.warning.bg,
    borderWidth: 1, borderColor: colors.warning.border,
  },
});

import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { totalPairs } from "@bq/core";
import type { Product } from "@bq/types";
import { color, space } from "@/theme";
import {
  BottomSheet, Pill, Price, ProductImage, SizeList, StockStamp, T, TextButton,
  type SizeQty,
} from "../ui";
import { ColorPicker } from "./ColorPicker";
import { OrderDock } from "./OrderDock";

export interface QuickAddSheetProps {
  /** Mẫu đang đặt. `null` = sheet đóng. */
  product: Product | null;
  onClose: () => void;
  /** Thêm vào giỏ. Trả số đôi đã thêm để màn hiện toast. */
  onAdd: (product: Product, sizes: SizeQty) => void;
  /** Hạn mức khả dụng của đại lý. */
  creditAvailable: number;
  /** Tổng tiền giỏ hiện tại, KHÔNG tính phần của `product`. */
  cartSubtotalWithout: number;
  /** Số đôi theo size mà mẫu này đã có sẵn trong giỏ, để điền trước. */
  existing?: SizeQty;
  /** Lúc đọc tồn kho từ API. */
  stockFetchedAt: Date;
  onRefreshStock?: () => void;
  onExceedStock?: (size: string, stock: number) => void;
}

/**
 * Sheet "Đặt nhanh" (SPEC §3.4) — mở từ nút (+) trên thẻ sản phẩm.
 *
 * Sheet tự giữ bảng size trong state và tự nạp lại mỗi lần đổi mẫu, nên màn gọi
 * không phải nhớ reset. Trước đây việc reset nằm ở màn và đã có lần quên: mở mẫu
 * thứ hai thì số đôi của mẫu thứ nhất còn nguyên.
 */
export function QuickAddSheet({ product, ...rest }: QuickAddSheetProps) {
  // Gắn `key` theo mã mẫu để React DỰNG LẠI sheet khi đổi mẫu. Cách cũ là một
  // effect gọi setState để nạp lại lựa chọn, nhưng đó là hai lượt render thừa
  // và lint React 19 chặn đúng — remount diễn đạt ý "đây là phiên khác" rõ hơn.
  if (!product) return null;
  return <QuickAddBody key={product.code} product={product} {...rest} />;
}

function QuickAddBody({
  product, onClose, onAdd, creditAvailable, cartSubtotalWithout, existing,
  stockFetchedAt, onRefreshStock, onExceedStock,
}: QuickAddSheetProps & { product: Product }) {
  const [sizes, setSizes] = useState<SizeQty>(() => existing ?? {});
  const [colour, setColour] = useState(() => product.colors?.[0] ?? "");

  const pairs = totalPairs(sizes);
  const money = pairs * product.price;

  /**
   * Hạn mức còn = khả dụng − (giỏ không tính mẫu này + lựa chọn hiện tại).
   * Âm thì báo "Vượt X" nhưng VẪN cho đặt: đơn sẽ đi nhánh chờ Sale duyệt
   * (SPEC §3.4), chặn ở đây là chặn nhầm chỗ.
   */
  const left = creditAvailable - (cartSubtotalWithout + money);

  const header = useMemo(() => {
    return (
      <View style={styles.head}>
        <ProductImage uri={product.image} style={styles.thumb} />
        <View style={styles.headText}>
          <T variant="chip" tone="muted" numberOfLines={1}>
            {[product.code, product.category].filter(Boolean).join(", ")}
          </T>
          <T variant="cardTitle" weight="bold" numberOfLines={2}>{product.name}</T>
          <Price value={product.price} suffix="/đôi" variant="bodyStrong" weight="bold" />
        </View>
      </View>
    );
  }, [product]);

  const addAll = () => {
    // "+1 mỗi size": cộng 1 đôi cho MỌI size còn hàng, không vượt tồn kho.
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
    <BottomSheet
      visible
      onClose={onClose}
      header={header}
      footer={
        <View style={styles.footer}>
          <OrderDock pairs={pairs} money={money} left={left} available={creditAvailable - cartSubtotalWithout} />
          <Pill
            label="Thêm vào giỏ"
            disabled={pairs === 0}
            leading={<Ionicons name="bag-outline" size={20} color={color.white} />}
            onPress={() => onAdd(product, sizes)}
          />
        </View>
      }
    >
      <View style={styles.controls}>
        {product.colors?.length ? (
          <View style={styles.colourRow}>
            <T variant="label" weight="semibold">Màu</T>
            <ColorPicker
              colors={product.colors}
              value={colour}
              onChange={setColour}
              style={styles.colourList}
            />
          </View>
        ) : <View />}
        <TextButton label="Thêm 1 đôi mỗi size" underline onPress={addAll} />
      </View>

      <StockStamp fetchedAt={stockFetchedAt} onRefresh={onRefreshStock} style={styles.stamp} />

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <SizeList
          stock={product.sizes}
          value={sizes}
          onChange={setSizes}
          onExceedStock={onExceedStock}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, flexDirection: "row", gap: space.x3 },
  thumb: { width: 76 },
  headText: { flex: 1, gap: 2 },
  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: space.x3, paddingBottom: space.x3,
  },
  colourRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.x3 },
  colourList: { flex: 1 },
  stamp: { paddingBottom: space.x2 },
  // Cao tối đa để sheet không vượt ~85% màn: phần đầu + điều khiển + đáy chiếm
  // khoảng 330, còn lại dành cho danh sách size.
  list: { maxHeight: 360 },
  footer: { gap: space.x3 },
});

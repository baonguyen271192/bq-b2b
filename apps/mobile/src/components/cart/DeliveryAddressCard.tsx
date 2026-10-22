import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space } from "@/theme";
import { AddressPin, T, formatAddress, type Address } from "../ui";

export interface DeliveryAddressCardProps {
  address?: Address | null;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Card "Giao đến" ở đầu Giỏ hàng (SPEC §3.6).
 *
 * Chevron VẪN hiện khi đại lý chỉ có một địa chỉ (SPEC §3.24): nó không chỉ là
 * "đổi địa chỉ" mà còn là lối duy nhất để thêm địa chỉ mới ngay trong luồng đặt
 * hàng. Bỏ chevron đi thì đại lý một địa chỉ bị kẹt.
 */
export function DeliveryAddressCard({ address, onPress, style }: DeliveryAddressCardProps) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={
        address ? `Giao đến ${address.label}, đổi địa chỉ` : "Thêm địa chỉ giao hàng"
      }
      style={[styles.card, down && styles.down, style]}
    >
      <AddressPin />
      <View style={styles.text}>
        <T variant="chip" tone="muted">Giao đến</T>
        {address ? (
          <>
            <T variant="label" weight="semibold" numberOfLines={1}>{address.label}</T>
            <T variant="small" tone="muted" numberOfLines={2}>{formatAddress(address)}</T>
          </>
        ) : (
          <T variant="label" weight="semibold" tone="brand">Thêm địa chỉ giao hàng</T>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={color.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    backgroundColor: color.paper, borderRadius: radius.card, padding: space.x4,
  },
  text: { flex: 1, gap: 1 },
  down: { transform: [{ scale: 0.98 }] },
});

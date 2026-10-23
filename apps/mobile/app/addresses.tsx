import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session";
import { addressRepository } from "@/lib/repo/addresses";
import { color, space } from "@/theme";
import { AddressSheet } from "@/components/cart/AddressSheet";
import {
  AddressCard, Dock, DOCK_CLEARANCE_ACTIONS, EmptyState, Pill, ScreenHeader, Toast, type Address,
} from "@/components/ui";

/**
 * Sổ địa chỉ giao hàng (SPEC §3.23, ảnh `23-Addresses.png`).
 *
 * Dùng LẠI nguyên `AddressCard` và form của {@link AddressSheet} mà Giỏ hàng
 * dùng — SPEC §3.25 yêu cầu đúng vậy, và nhờ thế quy tắc "địa chỉ đầu tiên là
 * mặc định" chỉ sống ở một chỗ.
 */
export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dealer) return;
    setAddresses(await addressRepository.list(dealer.code));
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!dealer) return null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingTop: insets.top + space.x3,
            paddingBottom: DOCK_CLEARANCE_ACTIONS + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          variant="back"
          title="Sổ địa chỉ"
          caption={addresses === null ? " " : `${addresses.length} địa chỉ giao hàng`}
          onBack={() => router.back()}
        />

        {addresses !== null && addresses.length === 0 ? (
          <EmptyState
            icon="location-outline"
            title="Chưa có địa chỉ giao hàng"
            hint="Thêm ít nhất một địa chỉ để đặt hàng được."
            actionLabel="Thêm địa chỉ mới"
            onActionPress={() => setSheet(true)}
          />
        ) : null}

        {(addresses ?? []).map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            onEdit={() => { setEditing(a); setSheet(true); }}
            onSetDefault={() => {
              void addressRepository.setDefault(dealer.code, a.id).then(setAddresses);
            }}
          />
        ))}
      </ScrollView>

      <Dock>
        <Pill
          label="Thêm địa chỉ mới"
          style={styles.flex}
          leading={<Ionicons name="add" size={20} color={color.white} />}
          onPress={() => { setEditing(null); setSheet(true); }}
        />
      </Dock>

      <AddressSheet
        visible={sheet}
        onClose={() => { setSheet(false); setEditing(null); }}
        addresses={addresses ?? []}
        startOnForm
        editing={editing}
        onSelect={() => {}}
        onCreate={async (draft) => {
          await addressRepository.add(dealer.code, draft);
          setAddresses(await addressRepository.list(dealer.code));
          setSheet(false);
        }}
        onUpdate={async (next) => {
          await addressRepository.update(dealer.code, next);
          setAddresses(await addressRepository.list(dealer.code));
          setSheet(false);
          setEditing(null);
        }}
        onDelete={async (address) => {
          setAddresses(await addressRepository.remove(dealer.code, address.id));
          setSheet(false);
          setEditing(null);
          setToast(`Đã xoá "${address.label}"`);
        }}
      />

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  flex: { flex: 1 },
});

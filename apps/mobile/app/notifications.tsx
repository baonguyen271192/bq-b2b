import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import {
  notificationRepository, type Notification, type NotificationGroup,
} from "@/lib/repo/notifications";
import { color, space } from "@/theme";
import {
  Card, EmptyState, NotificationRow, ScreenHeader, SegmentedControl, Skeleton, T, TextButton,
} from "@/components/ui";

type Tab = "all" | NotificationGroup;

/** "10 phút trước" / "Hôm qua" / "14/10/2026" — quy về mốc gần gũi khi có thể. */
function relative(at: Date, now: Date): string {
  const mins = Math.round((now.getTime() - at.getTime()) / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} giờ trước`;
  if (mins < 48 * 60) return "Hôm qua";
  return `${String(at.getDate()).padStart(2, "0")}/${String(at.getMonth() + 1).padStart(2, "0")}/${at.getFullYear()}`;
}

/** Một ngày, tính bằng mili giây. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Hôm nay" = 24 GIỜ gần nhất, không cắt theo nửa đêm.
 *
 * Cắt theo ngày lịch thì một thông báo "6 giờ trước" rơi xuống nhóm "Trước đó"
 * ngay khi qua 0 giờ — hai dòng chữ cạnh nhau nói ngược nhau. Cửa sổ trượt khớp
 * với nhãn thời gian tương đối ở ngay bên phải nó.
 */
function isRecent(at: Date, now: Date): boolean {
  const diff = now.getTime() - at.getTime();
  return diff >= 0 && diff < DAY_MS;
}

/**
 * Thông báo (SPEC §3.20, ảnh `20-Notifications.png`).
 *
 * Danh sách được SUY RA từ đơn hàng và công nợ thật (xem
 * `src/lib/repo/notifications.ts`) — không có API thông báo, và bịa một danh
 * sách cho đẹp ảnh thì màn này sẽ nói dối ngay ngày đầu chạy thật.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const [rows, setRows] = useState<Notification[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  /** Mốc "bây giờ" chốt một lần mỗi lần tải, để nhãn thời gian không nhảy. */
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!dealer) return;
    setNow(new Date());
    setRows(await notificationRepository.list(dealer.code));
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const shown = useMemo(
    () => (rows ?? []).filter((n) => tab === "all" || n.group === tab),
    [rows, tab],
  );
  const unread = (rows ?? []).filter((n) => !n.read).length;
  const today = shown.filter((n) => isRecent(n.at, now));
  const earlier = shown.filter((n) => !isRecent(n.at, now));

  const open = (n: Notification) => {
    notificationRepository.markRead(n.id);
    setRows((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
    if (n.href) router.push(n.href);
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
        title="Thông báo"
        caption={rows === null ? " " : `${unread} chưa đọc`}
        onBack={() => router.back()}
        trailing={
          unread > 0 ? (
            <TextButton
              label="Đọc tất cả"
              underline
              onPress={() => {
                notificationRepository.markAllRead((rows ?? []).map((n) => n.id));
                setRows((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
              }}
            />
          ) : undefined
        }
      />

      <SegmentedControl
        options={[
          { value: "all", label: "Tất cả" },
          { value: "order", label: "Đơn hàng" },
          { value: "debt", label: "Công nợ" },
          { value: "invoice", label: "Hoá đơn" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {rows === null ? (
        <Skeleton height={180} shape="card" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Chưa có thông báo"
          hint="Thông báo về đơn hàng và công nợ sẽ hiện ở đây."
        />
      ) : (
        <>
          {today.length > 0 ? (
            <View style={styles.group}>
              <T variant="small" weight="semibold" tone="muted">24 giờ qua</T>
              <Card>
                {today.map((n, i) => (
                  <NotificationRow
                    key={n.id}
                    tone={n.kind}
                    title={n.title}
                    body={n.body}
                    at={relative(n.at, now)}
                    read={n.read}
                    divider={i < today.length - 1}
                    onPress={() => open(n)}
                  />
                ))}
              </Card>
            </View>
          ) : null}

          {earlier.length > 0 ? (
            <View style={styles.group}>
              <T variant="small" weight="semibold" tone="muted">Trước đó</T>
              <Card>
                {earlier.map((n, i) => (
                  <NotificationRow
                    key={n.id}
                    tone={n.kind}
                    title={n.title}
                    body={n.body}
                    at={relative(n.at, now)}
                    read={n.read}
                    divider={i < earlier.length - 1}
                    onPress={() => open(n)}
                  />
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, paddingBottom: space.x12, gap: space.x4 },
  group: { gap: space.x2 },
});

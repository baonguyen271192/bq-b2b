import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dayMonth, nextDueInvoice, unpaidInvoices, vnd, vndShort } from "@bq/core";
import type { CreditDetail } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, fontFamily, space, textStyle } from "@/theme";
import {
  Chip, Dock, DOCK_CLEARANCE_ACTIONS, Notice, Pill, Price, RadioCard, ScreenHeader, Skeleton, T,
} from "@/components/ui";

type Choice = "nearest" | "all" | "custom";

/** Gợi ý số tiền trả nhanh (SPEC §3.31). */
const QUICK_AMOUNTS = [20_000_000, 50_000_000, 100_000_000];

/**
 * Thanh toán công nợ, cho phép trả MỘT PHẦN (SPEC §3.31).
 *
 * Vào từ ba nơi: nút trên thẻ Công nợ, thẻ Trang chủ khi vượt hạn mức, và sheet
 * "Hạn mức đã dùng hết". Màn này chỉ CHỌN SỐ TIỀN rồi chuyển sang màn Chuyển
 * khoản — nó không ghi nhận thanh toán, vì việc đó là đối soát của BQ
 * (quyết định F).
 */
export default function PayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  /** Mã hoá đơn muốn trả, truyền từ nút "Thanh toán" ở Trang chủ (SPEC §5-N.12). */
  const { invoice } = useLocalSearchParams<{ invoice?: string }>();

  const [detail, setDetail] = useState<CreditDetail | null>(null);
  const [choice, setChoice] = useState<Choice>("nearest");
  const [custom, setCustom] = useState("");

  const load = useCallback(async () => {
    if (!dealer) return;
    try {
      setDetail(await api.credit(dealer.code));
    } catch {
      setDetail(null);
    }
  }, [dealer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const unpaid = useMemo(() => unpaidInvoices(detail?.invoices ?? []), [detail]);
  const nearest = useMemo(() => nextDueInvoice(detail?.invoices ?? []), [detail]);
  const debt = unpaid.reduce((s, r) => s + r.order.subtotal, 0);

  /**
   * Hoá đơn được chỉ đích danh qua tham số, nếu có — nút ở Trang chủ đứng cạnh
   * đúng một khoản nên phải mở ra với đúng khoản đó.
   */
  const picked = invoice ? unpaid.find((r) => r.order.id === invoice) ?? null : null;
  const target = picked ?? nearest;

  /** Số tiền sẽ trả, theo lựa chọn đang chọn. */
  const customAmount = Number(custom.replace(/\D/g, "")) || 0;
  const amount = choice === "nearest"
    ? (target?.order.subtotal ?? 0)
    : choice === "all" ? debt : customAmount;

  const valid = amount > 0;

  if (!dealer) return null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + space.x3, paddingBottom: DOCK_CLEARANCE_ACTIONS + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          variant="back"
          title="Thanh toán công nợ"
          caption={detail ? `Dư nợ hiện tại ${vnd(debt)}` : " "}
          onBack={() => router.back()}
        />

        {detail === null ? (
          <Skeleton height={96} shape="card" />
        ) : (
          <>
            {target ? (
              <RadioCard
                selected={choice === "nearest"}
                onPress={() => setChoice("nearest")}
                accessibilityLabel={`Trả hoá đơn ${target.order.id}, ${vnd(target.order.subtotal)}`}
              >
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <T variant="bodyStrong" weight="semibold">
                      {picked ? "Hoá đơn này" : "Hoá đơn gần hạn nhất"}
                    </T>
                    <T variant="small" tone="muted">
                      {`${target.order.id}${target.due ? `, hạn ${dayMonth(target.due)}` : ""}`}
                    </T>
                  </View>
                  <Price value={target.order.subtotal} variant="bodyStrong" weight="bold" />
                </View>
              </RadioCard>
            ) : null}

            <RadioCard
              selected={choice === "all"}
              onPress={() => setChoice("all")}
              accessibilityLabel={`Trả toàn bộ dư nợ, ${vnd(debt)}`}
            >
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <T variant="bodyStrong" weight="semibold">Toàn bộ dư nợ</T>
                  <T variant="small" tone="muted">{`${unpaid.length} hoá đơn`}</T>
                </View>
                <Price value={debt} variant="bodyStrong" weight="bold" />
              </View>
            </RadioCard>

            <RadioCard
              selected={choice === "custom"}
              onPress={() => setChoice("custom")}
              accessibilityLabel="Trả một số tiền khác"
            >
              <View style={styles.customBody}>
                <T variant="bodyStrong" weight="semibold">Số tiền khác</T>
                {/* Chỉ mở ô nhập khi đã chọn: ô số cỡ 30 luôn hiện sẽ tranh hết
                    sự chú ý với hai lựa chọn ở trên. */}
                {choice === "custom" ? (
                  <>
                    <View style={styles.amountRow}>
                      <TextInput
                        value={custom ? groupVnd(custom) : ""}
                        onChangeText={(v) => setCustom(v.replace(/\D/g, ""))}
                        placeholder="0"
                        placeholderTextColor={color.line}
                        keyboardType="number-pad"
                        accessibilityLabel="Số tiền muốn trả"
                        style={styles.amountInput}
                      />
                      <T variant="title">đ</T>
                    </View>
                    <View style={styles.quick}>
                      {QUICK_AMOUNTS.map((v) => (
                        <Chip
                          key={v}
                          label={vndShort(v)}
                          variant="filter"
                          onPress={() => setCustom(String(v))}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            </RadioCard>

            {valid ? (
              <Notice kind="ok">
                {`Khi BQ ghi nhận, hạn mức khả dụng tăng thêm ${vnd(amount)}.`}
              </Notice>
            ) : null}

            {/* TODO(api): quy tắc cấn trừ chưa được BQ xác nhận (câu hỏi 5 trong
                báo cáo rà soát). Nói rõ là đang chờ, không hứa chắc. */}
            <T variant="small" tone="muted">
              Khoản trả được cấn vào hoá đơn cũ nhất trước (chờ BQ xác nhận quy tắc này).
            </T>
          </>
        )}
      </ScrollView>

      <Dock>
        <Pill
          label="Tạo mã chuyển khoản"
          disabled={!valid}
          style={styles.flex}
          onPress={() => router.push({
            // `cong-no` = trả theo SỐ TIỀN, không gắn vào một hoá đơn nào.
            pathname: choice === "nearest" && target
              ? `/transfer/${target.order.id}`
              : "/transfer/cong-no",
            params: { amount: String(amount) },
          })}
        />
      </Dock>
    </View>
  );
}

/** "50000000" -> "50.000.000" trong lúc gõ. */
function groupVnd(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { paddingHorizontal: space.screen, gap: space.x3 },
  row: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  rowText: { flex: 1, gap: 1 },
  customBody: { flex: 1, gap: space.x3 },
  amountRow: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    borderBottomWidth: 2, borderBottomColor: color.ink, paddingBottom: space.x2,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamily.extrabold,
    fontSize: textStyle.screenTitle.fontSize,
    lineHeight: textStyle.screenTitle.lineHeight,
    letterSpacing: textStyle.screenTitle.letterSpacing,
    color: color.ink,
    padding: 0,
  },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  flex: { flex: 1 },
});

import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { vnd } from "@bq/core";
import type { AssistantCreateOrderAction, Product } from "@bq/types";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { addressRepository } from "@/lib/repo/addresses";
import { checkStock } from "@/lib/repo/orders";
import { color, fontFamily, radius, space, textStyle } from "@/theme";
import { DraftOrderCard } from "@/components/assistant/DraftOrderCard";
import { Ionicons } from "@expo/vector-icons";
import { ChatBubble, Chip, IconButton, T, Toast } from "@/components/ui";

interface Bubble {
  id: string;
  from: "me" | "bot";
  text: string;
  action?: AssistantCreateOrderAction;
}

/**
 * Lời chào gọi THẲNG TÊN đại lý.
 *
 * Bản cũ chốt cứng "Chào anh" — đại lý nào không phải nam thì câu đầu tiên của
 * app đã gọi sai. Tên đại lý vừa đúng với mọi người vừa nói rõ app biết đang nói
 * chuyện với ai.
 */
const greetingFor = (name: string): Bubble => ({
  id: "greeting",
  from: "bot",
  text: `Chào ${name}, em có thể tra tồn kho, công nợ hoặc lên đơn nhanh.`,
});

/**
 * Backend trả câu in đậm kiểu markdown (`**25.536.000đ**`). `ChatBubble` là chữ
 * thuần nên dấu sao sẽ hiện nguyên — bỏ đi thay vì kéo cả bộ render markdown
 * vào cho đúng hai dấu sao.
 *
 * Đồng thời chuẩn hoá ký hiệu tiền về "đ" như cả app. Chỉ dẫn hệ thống đã yêu
 * cầu LLM viết "đ", nhưng chỉ dẫn là lời khuyên chứ không phải ràng buộc — đã
 * thấy cùng một hội thoại trả "297.414.600₫" ở câu này và "297.414.600 VNĐ" ở
 * câu kế. Chặn ở đây là chặn chắc.
 */
function plain(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/(\d)\s*(?:VNĐ|VND|₫|đồng)\b/gi, "$1đ");
}

/** Gợi ý mặc định khi API chưa trả `chips`. */
const FALLBACK_CHIPS = ["Công nợ của tôi", "Mẫu bán chạy tuần này"];

/** Trợ lý AI (SPEC §3.12, ảnh `12-AI.png`). */
export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const { upsert } = useCart();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  /** Đang chờ trả lời — xem `ask`. */
  const asking = useRef(false);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [chips, setChips] = useState<string[]>(FALLBACK_CHIPS);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deliverTo, setDeliverTo] = useState<string>();
  const [checks, setChecks] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!dealer) return;
    void addressRepository.list(dealer.code).then((rows) => {
      setDeliverTo(rows.find((a) => a.isDefault)?.label ?? rows[0]?.label);
    });
  }, [dealer]);

  /**
   * Kiểm tồn kho và hạn mức cho đơn nháp trợ lý vừa dựng.
   *
   * Dòng "✓ Đủ tồn kho, trong hạn mức" của SPEC phải là KẾT QUẢ KIỂM THẬT, không
   * phải câu trang trí: nó đứng ngay trên nút "Thêm vào giỏ" của một đơn vài
   * chục triệu.
   */
  const verify = async (id: string, action: AssistantCreateOrderAction) => {
    if (!dealer) return;
    const lines = action.lines.map((l) => ({
      code: l.code, name: l.name, image: l.image ?? "", unitPrice: l.unit_price, sizes: l.sizes,
    }));
    try {
      const short = await checkStock(dealer.code, lines);
      const overLimit = action.subtotal > (dealer.credit_available ?? 0);
      const message = short.length > 0
        ? `Thiếu hàng: ${short.map((s) => `size ${s.size} còn ${s.left}`).join(", ")}`
        : overLimit
          ? `Vượt hạn mức ${vnd(action.subtotal - dealer.credit_available)}, đơn sẽ chờ duyệt`
          : "Đủ tồn kho, trong hạn mức";
      setChecks((prev) => ({ ...prev, [id]: { ok: short.length === 0 && !overLimit, message } }));
    } catch {
      setChecks((prev) => ({
        ...prev,
        [id]: { ok: false, message: "Chưa kiểm được tồn kho — kiểm tra kết nối." },
      }));
    }
  };

  const ask = useCallback(async (question: string) => {
    // Chặn bằng ref chứ KHÔNG bằng state `thinking`: `setThinking(true)` chỉ có
    // hiệu lực ở lần render sau, nên hai lần chạm trong cùng một nhịp đều đọc ra
    // `false` và gửi hai lần — đã thấy một câu hỏi ra hai bong bóng với hai câu
    // trả lời khác nhau. `otp.tsx` dùng đúng cách này.
    if (!dealer || !question.trim() || asking.current) return;
    asking.current = true;
    const mine: Bubble = { id: `me-${Date.now()}`, from: "me", text: question.trim() };
    setBubbles((prev) => [...prev, mine]);
    setDraft("");
    setThinking(true);
    try {
      const reply = await api.assistant(dealer.code, question.trim());
      const id = `bot-${Date.now()}`;
      setBubbles((prev) => [...prev, { id, from: "bot", text: reply.answer, action: reply.action }]);
      setChips(reply.chips?.length ? reply.chips : FALLBACK_CHIPS);
      if (reply.action) void verify(id, reply.action);
    } catch {
      setBubbles((prev) => [...prev, {
        id: `err-${Date.now()}`, from: "bot",
        text: "Em chưa kết nối được. Anh kiểm tra mạng rồi hỏi lại giúp em nhé.",
      }]);
    } finally {
      asking.current = false;
      setThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealer]);

  const addToCart = async (action: AssistantCreateOrderAction) => {
    if (!dealer || adding) return;
    setAdding(true);
    try {
      // Đọc lại sản phẩm thay vì tin giá trong `action`: giá theo bậc và tồn
      // kho có thể đã đổi giữa lúc trợ lý trả lời và lúc anh ấy bấm.
      const rows = await api.products(dealer.code);
      const byCode = new Map<string, Product>(rows.map((p) => [p.code, p]));
      let added = 0;
      for (const line of action.lines) {
        const product = byCode.get(line.code);
        if (!product) continue;
        upsert(product, line.sizes);
        added += 1;
      }
      if (added === 0) { setToast("Mẫu trong đơn nháp này đã ngừng bán."); return; }
      router.push("/cart");
    } catch {
      setToast("Không thêm được vào giỏ. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setAdding(false);
    }
  };

  if (!dealer) return null;

  // Lời chào là giá trị DẪN XUẤT từ tên đại lý, không phải phần tử đầu của
  // `bubbles`: seed vào state thì nó chốt ở lần render đầu, lúc phiên có thể
  // chưa khôi phục xong và `dealer` còn null.
  const thread = [greetingFor(dealer.name), ...bubbles];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + space.x3 }]}>
        <IconButton icon="chevron-back" accessibilityLabel="Quay lại" onPress={() => router.back()} />
        {/* Icon lấp lánh, không phải chữ viết tắt (SPEC §3.12): "Trợ lý BQ"
            rút gọn ra "LB", vô nghĩa. */}
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={18} color={color.white} />
        </View>
        <View style={styles.headerText}>
          <T variant="cardTitle" weight="bold">Trợ lý BQ</T>
          <T variant="small" tone="muted">Tra tồn kho, công nợ, lên đơn</T>
        </View>
      </View>

      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.thread}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {thread.map((b) => (
          <View key={b.id} style={styles.turn}>
            <ChatBubble from={b.from}>{plain(b.text)}</ChatBubble>
            {b.action ? (
              <DraftOrderCard
                action={b.action}
                deliverTo={deliverTo}
                check={checks[b.id] ?? { ok: true, message: "Đang kiểm tồn kho…" }}
                adding={adding}
                onEdit={() => router.push(`/product/${b.action?.lines[0]?.code ?? ""}`)}
                onAdd={() => void addToCart(b.action as AssistantCreateOrderAction)}
              />
            ) : null}
          </View>
        ))}
        {thinking ? <ChatBubble from="bot">Em đang xem…</ChatBubble> : null}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: insets.bottom + space.x3 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chips.map((c) => (
            <Chip key={c} label={c} variant="filter" onPress={() => void ask(c)} />
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Nhập yêu cầu đặt hàng…"
            placeholderTextColor={color.muted}
            onSubmitEditing={() => void ask(draft)}
            accessibilityLabel="Nhập câu hỏi cho trợ lý"
            returnKeyType="send"
            style={styles.input}
          />
          <IconButton
            icon="send"
            tone="brand"
            accessibilityLabel="Gửi"
            disabled={!draft.trim() || thinking}
            onPress={() => void ask(draft)}
            style={styles.send}
          />
        </View>
      </View>

      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  header: {
    flexDirection: "row", alignItems: "center", gap: space.x3,
    paddingHorizontal: space.screen, paddingBottom: space.x3,
  },
  botAvatar: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: color.ink,
    alignItems: "center", justifyContent: "center",
  },
  headerText: { flex: 1, gap: 1 },
  thread: { paddingHorizontal: space.screen, paddingBottom: space.x5, gap: space.x3 },
  turn: { gap: space.x2 },
  foot: { paddingHorizontal: space.screen, gap: space.x3, backgroundColor: color.canvas },
  chips: { gap: space.x2 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: space.x3 },
  input: {
    flex: 1, height: 52, borderRadius: radius.pill, paddingHorizontal: space.x5,
    backgroundColor: color.paper, borderWidth: 1, borderColor: color.line,
    fontFamily: fontFamily.regular, fontSize: textStyle.body.fontSize, color: color.ink,
  },
  send: { width: 52, height: 52 },
});

import { useRef, useState, type ComponentRef } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AssistantProductCard } from "@bq/types";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { color, space } from "@/theme";
import { ChatBubble, Chip, IconButton, MiniProductCard, T, TextField } from "@/components/ui";

interface Bubble {
  id: string;
  from: "bot" | "me";
  text: string;
  cards?: AssistantProductCard[];
  chips?: string[];
}

const GREETING: Bubble = {
  id: "greeting",
  from: "bot",
  text:
    "Chào anh/chị, em tra được tồn kho, công nợ hoặc lên đơn nhanh. "
    + 'Ví dụ: "Đặt 20 đôi size 40-42 giao kho HCM".',
  chips: ["Công nợ của tôi", "Có giày cao gót nào không", "Đơn gần nhất của tôi"],
};

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dealer } = useSession();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const [bubbles, setBubbles] = useState<Bubble[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  const ask = async (question: string) => {
    if (!dealer || !question.trim() || thinking) return;
    setDraft("");
    setBubbles((b) => [...b, { id: `me-${Date.now()}`, from: "me", text: question }]);
    setThinking(true);
    try {
      const reply = await api.assistant(dealer.code, question);
      setBubbles((b) => [
        ...b,
        { id: `bot-${Date.now()}`, from: "bot", text: reply.answer, cards: reply.cards, chips: reply.chips },
      ]);
    } catch {
      setBubbles((b) => [
        ...b,
        {
          id: `err-${Date.now()}`,
          from: "bot",
          // Trợ lý hỏng không được chặn việc đặt hàng — nói rõ lối đi thay thế.
          text: "Em chưa kết nối được. Anh/chị vẫn đặt hàng bình thường ở tab Sản phẩm nhé.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={92}
    >
      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.body}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {bubbles.map((b) => (
          <View key={b.id} style={styles.turn}>
            <ChatBubble from={b.from}>{b.text}</ChatBubble>

            {b.cards?.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cards}
              >
                {b.cards.map((c) => (
                  <MiniProductCard
                    key={c.code}
                    name={c.name}
                    price={c.price}
                    image={c.image}
                    onPress={() => router.push(`/product/${c.code}`)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {b.chips?.length ? (
              <View style={styles.chips}>
                {b.chips.map((c) => <Chip key={c} label={c} onPress={() => ask(c)} />)}
              </View>
            ) : null}
          </View>
        ))}

        {thinking ? (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={color.faint} />
            <T variant="small" tone="muted">Đang tra cứu…</T>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.x3 }]}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder="Nhập yêu cầu đặt hàng…"
          accessibilityLabel="Nội dung gửi trợ lý"
          multiline
          onSubmitEditing={() => ask(draft)}
          style={styles.grow}
        />
        <IconButton
          icon="send"
          tone="brand"
          accessibilityLabel="Gửi"
          disabled={!draft.trim() || thinking}
          onPress={() => ask(draft)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  body: { padding: space.screen, gap: space.x3 },
  turn: { gap: space.x2 },
  cards: { gap: space.x2, paddingRight: space.screen },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.x2 },
  typing: {
    flexDirection: "row", alignItems: "center", gap: space.x2,
    alignSelf: "flex-start",
  },
  composer: {
    flexDirection: "row", alignItems: "flex-end", gap: space.x2,
    paddingHorizontal: space.screen, paddingTop: space.x3,
    backgroundColor: color.paper,
  },
  grow: { flex: 1 },
});

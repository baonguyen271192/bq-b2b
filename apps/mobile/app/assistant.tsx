import { useRef, useState, type ComponentRef } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { AssistantProductCard } from "@bq/types";
import { vnd } from "@bq/core";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Text, colors, radius, space } from "@/theme";

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
    "Chào anh/chị, em tra được tồn kho, công nợ hoặc lên đơn nhanh. " +
    'Ví dụ: "Đặt 20 đôi size 40-42 giao kho HCM".',
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
        {
          id: `bot-${Date.now()}`,
          from: "bot",
          text: reply.answer,
          cards: reply.cards,
          chips: reply.chips,
        },
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
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={92}
    >
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {bubbles.map((b) => (
          <View key={b.id} style={{ gap: space.sm }}>
            <View style={[styles.bubble, b.from === "me" ? styles.mine : styles.theirs]}>
              <Text
                variant="body"
                color={b.from === "me" ? colors.textOnBrand : colors.text}
              >
                {b.text}
              </Text>
            </View>

            {b.cards?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
                {b.cards.map((c) => (
                  <Pressable
                    key={c.code}
                    style={styles.card}
                    onPress={() => router.push(`/product/${c.code}`)}
                  >
                    <Image source={{ uri: c.image }} style={styles.cardImg} contentFit="cover" />
                    <View style={{ padding: space.sm, gap: 2 }}>
                      <Text variant="caption" weight="600" numberOfLines={2}>{c.name}</Text>
                      <Text variant="caption" weight="700" color={colors.brand[500]}>{vnd(c.price)}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {b.chips?.length ? (
              <View style={styles.chips}>
                {b.chips.map((c) => (
                  <Pressable key={c} onPress={() => ask(c)} style={styles.chip}>
                    <Text variant="caption" weight="600" color={colors.brand[500]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        {thinking ? (
          <View style={[styles.bubble, styles.theirs, styles.typing]}>
            <ActivityIndicator size="small" color={colors.textFaint} />
            <Text variant="bodySm" color={colors.textMuted}>Đang tra cứu…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.md }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nhập yêu cầu đặt hàng…"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          onSubmitEditing={() => ask(draft)}
          accessibilityLabel="Nội dung gửi trợ lý"
        />
        <Pressable
          onPress={() => ask(draft)}
          disabled={!draft.trim() || thinking}
          style={[styles.send, !draft.trim() || thinking ? { opacity: 0.4 } : null]}
          accessibilityLabel="Gửi"
        >
          <Ionicons name="send" size={18} color={colors.textOnBrand} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "88%", padding: space.md, borderRadius: radius.lg },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: radius.xs },
  mine: { alignSelf: "flex-end", backgroundColor: colors.brand[500] },
  typing: { flexDirection: "row", alignItems: "center", gap: space.sm },
  cards: { gap: space.sm, paddingRight: space.lg },
  card: {
    width: 128, backgroundColor: colors.surface,
    borderRadius: radius.md, overflow: "hidden",
    borderWidth: 1, borderColor: colors.border,
  },
  cardImg: { width: "100%", height: 104, backgroundColor: colors.surfaceSunken },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: 7,
    borderRadius: radius.pill, backgroundColor: colors.brand.tint,
  },
  composer: {
    flexDirection: "row", alignItems: "flex-end", gap: space.sm,
    padding: space.md, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, maxHeight: 110, minHeight: 44,
    paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md,
    borderRadius: radius.xl, backgroundColor: colors.surfaceSunken,
    fontFamily: "Inter_500Medium", fontSize: 15, color: colors.text,
  },
  send: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.brand[500], alignItems: "center", justifyContent: "center",
  },
});

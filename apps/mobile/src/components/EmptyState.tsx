import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, colors, radius, space } from "@/legacy-theme";
import { Button } from "./Button";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
}

/**
 * Trạng thái rỗng. Luôn kèm LỐI ĐI TIẾP — màn rỗng không có hành động là ngõ cụt,
 * người dùng chỉ còn cách bấm back.
 */
export function EmptyState({ icon, title, hint, action }: Props) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space["4xl"], gap: space.md }}>
      <View
        style={{
          width: 72, height: 72, borderRadius: radius.pill,
          backgroundColor: colors.surfaceSunken,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={30} color={colors.textFaint} />
      </View>
      <Text variant="h3" center>{title}</Text>
      {hint ? (
        <Text variant="bodySm" color={colors.textMuted} center style={{ maxWidth: 280 }}>
          {hint}
        </Text>
      ) : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} size="md" full={false} />
      ) : null}
    </View>
  );
}

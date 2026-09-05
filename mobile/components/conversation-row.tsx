import { Pressable, StyleSheet, View } from "react-native";
import { formatRelativeTime } from "@/lib/format";
import type { ConversationSummary } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Text } from "@/lib/ui";
import { PersonAvatar } from "@/components/person-row";

export function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  const { counterpart, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;

  const preview = lastMessage
    ? `${lastMessage.fromMe ? "You: " : ""}${lastMessage.body} · ${formatRelativeTime(lastMessage.createdAt)}`
    : "No messages yet";

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <PersonAvatar name={counterpart.name} role={counterpart.role} size={54} />
      <View style={styles.body}>
        <Text variant="body" tone="ink-900" weight="semibold" numberOfLines={1}>
          {counterpart.name}
        </Text>
        <Text variant="caption" tone={unread ? "ink-900" : "ink-600"} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 13, paddingHorizontal: 20, paddingVertical: 10 },
  body: { flex: 1, gap: 2, minWidth: 0 },
  dot: { backgroundColor: colors["rust-600"], borderRadius: 5, flexShrink: 0, height: 9, width: 9 },
});

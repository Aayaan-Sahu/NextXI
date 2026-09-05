import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConversationRow } from "@/components/conversation-row";
import { ComposeIcon } from "@/components/icons";
import { SearchField } from "@/components/search-field";
import { errorMessage } from "@/lib/api-client";
import { useConversations } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Notice, Text } from "@/lib/ui";

export default function MessagesList() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useConversations();
  const [query, setQuery] = useState("");
  const allConversations = data?.conversations ?? [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const conversations = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return allConversations;
    return allConversations.filter((conversation) =>
      conversation.counterpart.name.toLowerCase().includes(trimmed),
    );
  }, [allConversations, query]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          <Text variant="title" tone="ink-900" weight="display" uppercase>
            Messages
          </Text>
          <Pressable hitSlop={8} onPress={() => router.push("/messages/new")} style={styles.composeButton}>
            <ComposeIcon />
          </Pressable>
        </View>

        <SearchField onChangeText={setQuery} placeholder="Search" value={query} />
      </View>

      {isError && (
        <View style={styles.empty}>
          <Notice tone="error">{errorMessage(error)}</Notice>
        </View>
      )}

      {!isLoading && !isError && conversations.length === 0 && (
        <View style={styles.empty}>
          <Text variant="ui" tone="ink-600">
            {allConversations.length === 0
              ? "No conversations yet. Connect with someone, then start a message."
              : `No conversations match "${query}".`}
          </Text>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(conversation) => conversation.connectionId}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => router.push(`/messages/${item.connectionId}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  headerWrap: { paddingBottom: 14, paddingHorizontal: 20 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 52,
    justifyContent: "space-between",
  },
  composeButton: { alignItems: "center", height: 44, justifyContent: "center", marginRight: -10, width: 44 },
  empty: { paddingHorizontal: 20 },
});

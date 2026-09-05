import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackChevronIcon } from "@/components/icons";
import { PersonRow } from "@/components/person-row";
import { SearchField } from "@/components/search-field";
import { errorMessage } from "@/lib/api-client";
import { useConnections } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Hairline, Notice, Text } from "@/lib/ui";

/**
 * Who you can message is exactly who you're connected to — there's no
 * broader "start a chat with a stranger" flow in this product. Picking a
 * name here replaces this screen with that thread, the way Instagram's
 * "New message" hands off to the conversation it opens.
 */
export default function NewConversation() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useConnections();
  const [query, setQuery] = useState("");

  const people = useMemo(() => {
    const accepted = data?.accepted ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return accepted;
    return accepted.filter((person) => person.name.toLowerCase().includes(trimmed));
  }, [data, query]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
            <BackChevronIcon />
          </Pressable>
          <Text variant="title" tone="ink-900" weight="display" uppercase>
            New message
          </Text>
        </View>

        <SearchField onChangeText={setQuery} placeholder="Search" value={query} />
      </View>

      {isError && (
        <View style={styles.empty}>
          <Notice tone="error">{errorMessage(error)}</Notice>
        </View>
      )}

      {!isLoading && !isError && people.length === 0 && (
        <View style={styles.empty}>
          <Text variant="ui" tone="ink-600">
            {data?.accepted.length === 0
              ? "No connections yet — connect with someone first."
              : `No connections match "${query}".`}
          </Text>
        </View>
      )}

      <FlatList
        data={people}
        ItemSeparatorComponent={() => <Hairline style={styles.separator} />}
        keyExtractor={(person) => person.connectionId}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.replace(`/messages/${item.connectionId}`)}
            style={styles.row}
          >
            <PersonRow name={item.name} role={item.role} username={item.username} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  headerWrap: { paddingBottom: 14, paddingHorizontal: 20 },
  header: { alignItems: "center", flexDirection: "row", gap: 6, height: 52 },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", marginLeft: -8, width: 40 },
  empty: { paddingHorizontal: 20 },
  row: { paddingHorizontal: 20 },
  separator: { marginLeft: 20 + 38 + 12 },
});

import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackChevronIcon } from "@/components/icons";
import { PersonRow } from "@/components/person-row";
import { SearchField } from "@/components/search-field";
import { errorMessage } from "@/lib/api-client";
import {
  useCoachDirectory,
  useCreateConnectionRequest,
  usePlayerSearch,
  useRespondToConnection,
  type DirectoryConnectionState,
} from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Button, Notice, Text } from "@/lib/ui";

type Segment = "players" | "coaches";

const DIRECTORY_LABEL: Record<Exclude<DirectoryConnectionState, "incoming">, string> = {
  none: "Request to connect",
  pending: "Requested",
  accepted: "Connected",
  revoked: "Request again",
};

/**
 * A directory row's call to action: "Request to connect" (or its pending /
 * connected / revoked variants) for most states, but Accept / Ignore when the
 * match already sent the viewer a request — that direction only shows up as
 * "pending" from the sender's own directory search, never the recipient's.
 */
function DirectoryAction({
  id,
  connectionId,
  state,
}: {
  id: string;
  connectionId: string | null;
  state: DirectoryConnectionState;
}) {
  const create = useCreateConnectionRequest();
  const respond = useRespondToConnection();

  if (state === "incoming") {
    return (
      <View style={styles.incomingActions}>
        <Button
          loading={respond.isPending}
          onPress={() => respond.mutate({ connectionId: connectionId!, response: "accept" })}
          style={styles.rowButton}
        >
          Accept
        </Button>
        <Button
          onPress={() => respond.mutate({ connectionId: connectionId!, response: "decline" })}
          style={styles.rowButton}
          variant="secondary"
        >
          Ignore
        </Button>
      </View>
    );
  }

  return (
    <Button
      disabled={state === "pending" || state === "accepted"}
      loading={create.isPending}
      onPress={() => create.mutate(id)}
      style={styles.rowButton}
      variant={state === "none" || state === "revoked" ? "primary" : "secondary"}
    >
      {DIRECTORY_LABEL[state]}
    </Button>
  );
}

/** The "+" destination from the roster's header — search-to-connect, split by segment like the roster itself. */
export default function AddConnection() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("players");

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
          <BackChevronIcon />
        </Pressable>
        <Text variant="title" tone="ink-900" weight="display" uppercase>
          Add connections
        </Text>
      </View>

      <View style={styles.segmentRow}>
        <SegmentButton active={segment === "players"} label="Players" onPress={() => setSegment("players")} />
        <SegmentButton active={segment === "coaches"} label="Coaches" onPress={() => setSegment("coaches")} />
      </View>

      {segment === "players" ? <PlayerSearchPanel /> : <CoachSearchPanel />}
    </SafeAreaView>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text variant="ui" tone={active ? "rust-600" : "ink-600"} weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Search-only: there is no browsable roster of every player on the platform,
 * only a match against a name or @username you already have in mind, mirroring
 * the web's PlayerSearch. Searches as you type, debounced, like the coach
 * panel and the roster's own field — waiting on the return key made a typed
 * query look like it had found nothing.
 */
function PlayerSearchPanel() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, error } = usePlayerSearch(query);
  const players = data?.players ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SearchField
        onChangeText={setInput}
        onSubmitEditing={() => setQuery(input.trim())}
        placeholder="Enter player @username or name"
        returnKeyType="search"
        value={input}
      />

      {isError && <Notice tone="error">{errorMessage(error)}</Notice>}

      {query && !isLoading && !isError && players.length === 0 && (
        <Text variant="ui" tone="ink-600" style={styles.hint}>
          No players match &quot;{query}&quot;. If their account is private, type their full
          @username.
        </Text>
      )}

      {players.map((player) => (
        <PersonRow
          avatarSize={46}
          key={player.id}
          name={player.name}
          role="player"
          username={player.username}
          right={
            <DirectoryAction connectionId={player.connectionId} id={player.id} state={player.state} />
          }
        />
      ))}
    </ScrollView>
  );
}

/**
 * Browsable: unlike players, you can find an approved coach on the platform
 * without already knowing their username, so this searches live as you type.
 */
function CoachSearchPanel() {
  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { data, isLoading, isError, error } = useCoachDirectory(debouncedQuery);
  const coaches = data?.coaches ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SearchField onChangeText={setInput} placeholder="Enter coach @username or name" value={input} />

      {isError && <Notice tone="error">{errorMessage(error)}</Notice>}

      {!isLoading && !isError && coaches.length === 0 && (
        <Text variant="ui" tone="ink-600" style={styles.hint}>
          {debouncedQuery ? `No coaches match "${debouncedQuery}".` : "No approved coaches yet."}
        </Text>
      )}

      {coaches.map((coach) => (
        <PersonRow
          avatarSize={46}
          detail={coach.accomplishments[0] ?? null}
          key={coach.id}
          name={coach.name}
          role="coach"
          username={coach.username}
          right={<DirectoryAction connectionId={coach.connectionId} id={coach.id} state={coach.state} />}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", marginLeft: -8, width: 40 },
  segmentRow: {
    borderBottomColor: colors["cream-400"],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 24,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  segmentButton: { borderBottomColor: "transparent", borderBottomWidth: 2, paddingBottom: 9 },
  segmentButtonActive: { borderBottomColor: colors["rust-600"] },
  content: { gap: 4, paddingBottom: 48, paddingHorizontal: 20, paddingTop: 16 },
  hint: { paddingVertical: 12 },
  incomingActions: { flexDirection: "row", gap: 8 },
  rowButton: { paddingHorizontal: 12, paddingVertical: 8 },
});

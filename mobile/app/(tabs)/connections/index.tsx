import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { CloseIcon, PersonAddIcon } from "@/components/icons";
import { PersonAvatar, PersonRow } from "@/components/person-row";
import { SearchField } from "@/components/search-field";
import { errorMessage } from "@/lib/api-client";
import { useConnections, useRemoveConnection, type ConnectionPerson } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Button, Hairline, Notice, Text } from "@/lib/ui";

type Segment = "players" | "coaches";

const ROSTER_PAGE_SIZE = 5;
const ROSTER_AVATAR_SIZE = 46;

export default function Connections() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useConnections();
  const [segment, setSegment] = useState<Segment>("players");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const remove = useRemoveConnection();
  // The person the confirm sheet is asking about. Kept once the sheet closes
  // so its exit animation still has a name and a face to render.
  const [removalTarget, setRemovalTarget] = useState<ConnectionPerson | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setShowAll(false);
  }, [segment]);

  const accepted = data?.accepted ?? [];
  const allIncomingPending = data?.incomingPending ?? [];
  const players = accepted.filter((person) => person.role !== "coach");
  const coaches = accepted.filter((person) => person.role === "coach");
  const roster = segment === "coaches" ? coaches : players;
  const incomingPending = allIncomingPending.filter((person) =>
    segment === "coaches" ? person.role === "coach" : person.role !== "coach",
  );

  const trimmedQuery = debouncedQuery.toLowerCase();
  const matchesQuery = (person: ConnectionPerson) =>
    !trimmedQuery ||
    person.name.toLowerCase().includes(trimmedQuery) ||
    (person.username ?? "").toLowerCase().includes(trimmedQuery);

  const filteredRoster = trimmedQuery ? roster.filter(matchesQuery) : roster;
  const visibleRoster = trimmedQuery || showAll ? filteredRoster : filteredRoster.slice(0, ROSTER_PAGE_SIZE);
  const hiddenCount = filteredRoster.length - visibleRoster.length;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="title" tone="ink-900" weight="display" uppercase style={styles.title}>
            Connections
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => router.push("/(tabs)/connections/add")}
            style={styles.titleIcon}
          >
            <PersonAddIcon />
          </Pressable>
        </View>

        <View style={styles.segmentRow}>
          <SegmentButton
            active={segment === "players"}
            label={`Players ${players.length}`}
            onPress={() => setSegment("players")}
          />
          <SegmentButton
            active={segment === "coaches"}
            label={`Coaches ${coaches.length}`}
            onPress={() => setSegment("coaches")}
          />
        </View>

        <SearchField
          onChangeText={setQuery}
          placeholder={segment === "coaches" ? "Search coaches" : "Search players"}
          value={query}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isError && <Notice tone="error">{errorMessage(error)}</Notice>}
        {remove.isError && (
          <Notice tone="error" style={styles.removeError}>
            {errorMessage(remove.error)}
          </Notice>
        )}

        {incomingPending.length > 0 && (
          <Pressable
            onPress={() => router.push("/(tabs)/connections/requests")}
            style={styles.requestsBanner}
          >
            <View style={styles.requestsAvatars}>
              {incomingPending.slice(0, 2).map((person, index) => (
                <PersonAvatar
                  key={person.connectionId}
                  name={person.name}
                  role={person.role}
                  size={30}
                  style={[styles.requestsAvatar, index > 0 && styles.requestsAvatarOverlap]}
                />
              ))}
            </View>
            <View style={styles.requestsBody}>
              <Text variant="ui" tone="ink-900" weight="semibold">
                {incomingPending.length} connection request{incomingPending.length === 1 ? "" : "s"}
              </Text>
              <Text variant="caption" tone="ink-600" numberOfLines={1}>
                {incomingPending.map((person) => person.name).join(" · ")}
              </Text>
            </View>
            <Text variant="caption" tone="rust-600" weight="semibold">
              Review
            </Text>
          </Pressable>
        )}

        <View style={styles.rosterSection}>
          <Text variant="caption" tone="ink-600" weight="display" uppercase style={styles.rosterLabel}>
            {segment === "coaches" ? `Coaches — ${coaches.length}` : `Players — ${players.length}`}
          </Text>

          {!isLoading && !isError && filteredRoster.length === 0 && (
            <Text variant="ui" tone="ink-600" style={styles.rosterEmpty}>
              {trimmedQuery
                ? `No ${segment} match "${debouncedQuery}".`
                : segment === "coaches"
                  ? "No coaches yet."
                  : "No players yet."}
            </Text>
          )}
          {visibleRoster.map((person) => (
            <PersonRow
              avatarSize={ROSTER_AVATAR_SIZE}
              key={person.connectionId}
              name={person.name}
              role={person.role}
              username={person.username}
              right={
                <View style={styles.rowActions}>
                  <Button
                    onPress={() => router.push(`/messages/${person.connectionId}`)}
                    style={styles.messageButton}
                    variant="secondary"
                  >
                    Message
                  </Button>
                  <Pressable
                    accessibilityLabel={`Remove ${person.name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      remove.reset();
                      setRemovalTarget(person);
                      setConfirmingRemoval(true);
                    }}
                    style={styles.removeButton}
                  >
                    <CloseIcon />
                  </Pressable>
                </View>
              }
            />
          ))}
          {hiddenCount > 0 && (
            <Pressable onPress={() => setShowAll(true)} style={styles.showMore}>
              <Text variant="caption" tone="rust-600" weight="semibold">
                Show {hiddenCount} more {segment}
              </Text>
            </Pressable>
          )}
        </View>

        {segment === "coaches" && (
          <View style={styles.footnoteWrap}>
            <Hairline />
            <Text variant="caption" tone="ink-600" style={styles.footnote}>
              Only connections can message you or see your reports.
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmSheet
        confirmLabel="Remove"
        header={
          removalTarget && (
            <PersonAvatar name={removalTarget.name} role={removalTarget.role} size={56} />
          )
        }
        loading={remove.isPending}
        message={
          <>
            {"We won't tell "}
            <Text variant="ui" tone="ink-900" weight="semibold">
              {removalTarget?.name ?? "them"}
            </Text>
            {" they were removed. Your messages with them are deleted for both of you."}
          </>
        }
        onCancel={() => setConfirmingRemoval(false)}
        onConfirm={() => {
          if (!removalTarget) return;
          remove.mutate(removalTarget.connectionId, {
            onSettled: () => setConfirmingRemoval(false),
          });
        }}
        title="Remove connection?"
        visible={confirmingRemoval}
      />
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

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  header: {
    backgroundColor: colors["cream-200"],
    borderBottomColor: colors["cream-400"],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  titleRow: { alignItems: "center", flexDirection: "row", height: 52, justifyContent: "space-between" },
  title: { letterSpacing: 0.7 },
  titleIcon: { alignItems: "center", height: 44, justifyContent: "center", marginRight: -10, width: 44 },
  segmentRow: { flexDirection: "row", gap: 24 },
  segmentButton: { borderBottomColor: "transparent", borderBottomWidth: 2, paddingBottom: 9 },
  segmentButtonActive: { borderBottomColor: colors["rust-600"] },
  content: { paddingBottom: 48 },
  requestsBanner: {
    alignItems: "center",
    backgroundColor: colors["cream-100"],
    borderBottomColor: colors["cream-400"],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  requestsAvatars: { flexDirection: "row" },
  requestsAvatar: { borderColor: colors["cream-100"], borderWidth: 2 },
  requestsAvatarOverlap: { marginLeft: -10 },
  requestsBody: { flex: 1, gap: 1, minWidth: 0 },
  rosterSection: { paddingHorizontal: 20 },
  rosterLabel: { letterSpacing: 1.8, paddingTop: 16, paddingBottom: 8 },
  rosterEmpty: { paddingVertical: 8 },
  showMore: { paddingVertical: 14 },
  footnoteWrap: { marginTop: 8 },
  footnote: { lineHeight: 20.8, paddingHorizontal: 20, paddingVertical: 16 },
  messageButton: { height: 36, paddingHorizontal: 14, paddingVertical: 0 },
  rowActions: { alignItems: "center", flexDirection: "row", gap: 4 },
  removeButton: { alignItems: "center", height: 36, justifyContent: "center", width: 28 },
  removeError: { marginHorizontal: 20, marginTop: 12 },
});

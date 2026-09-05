import { useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackChevronIcon } from "@/components/icons";
import { PersonRow } from "@/components/person-row";
import { errorMessage } from "@/lib/api-client";
import {
  useCancelConnectionRequest,
  useConnections,
  useRespondToConnection,
  type ConnectionPerson,
} from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Button, Hairline, Kicker, Notice, Text } from "@/lib/ui";

/** The "Review" destination from the roster's pending-requests banner. */
export default function ConnectionRequests() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useConnections();
  const incomingPending = data?.incomingPending ?? [];
  const outgoingPending = data?.outgoingPending ?? [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackChevronIcon />
        </Pressable>
        <Text variant="title" tone="ink-900" weight="display" uppercase>
          Connection requests
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isError && <Notice tone="error">{errorMessage(error)}</Notice>}

        {!isLoading && !isError && incomingPending.length === 0 && outgoingPending.length === 0 && (
          <Text variant="ui" tone="ink-600">
            No pending requests.
          </Text>
        )}

        {incomingPending.length > 0 && (
          <View style={styles.section}>
            <Kicker>Waiting on you</Kicker>
            {incomingPending.map((person, index) => (
              <View key={person.connectionId}>
                {index > 0 && <Hairline />}
                <IncomingRow person={person} />
              </View>
            ))}
          </View>
        )}

        {outgoingPending.length > 0 && (
          <View style={styles.section}>
            <Kicker>Sent</Kicker>
            {outgoingPending.map((person, index) => (
              <View key={person.connectionId}>
                {index > 0 && <Hairline />}
                <OutgoingRow person={person} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IncomingRow({ person }: { person: ConnectionPerson }) {
  const respond = useRespondToConnection();

  return (
    <PersonRow
      avatarSize={46}
      name={person.name}
      role={person.role}
      username={person.username}
      right={
        <View style={styles.rowActions}>
          <Button
            loading={respond.isPending}
            onPress={() => respond.mutate({ connectionId: person.connectionId, response: "accept" })}
            style={styles.rowButton}
          >
            Accept
          </Button>
          <Button
            onPress={() => respond.mutate({ connectionId: person.connectionId, response: "decline" })}
            style={styles.rowButton}
            variant="secondary"
          >
            Ignore
          </Button>
        </View>
      }
    />
  );
}

function OutgoingRow({ person }: { person: ConnectionPerson }) {
  const cancel = useCancelConnectionRequest();

  return (
    <PersonRow
      detail="Requested"
      name={person.name}
      role={person.role}
      username={person.username}
      right={
        <Button
          loading={cancel.isPending}
          onPress={() => cancel.mutate(person.connectionId)}
          style={styles.rowButton}
          variant="secondary"
        >
          Cancel
        </Button>
      }
    />
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
  content: { gap: 24, paddingBottom: 48, paddingHorizontal: 20 },
  section: { gap: 4 },
  rowActions: { flexDirection: "row", gap: 8 },
  rowButton: { paddingHorizontal: 12, paddingVertical: 8 },
});

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackChevronIcon } from "@/components/icons";
import { PersonAvatar } from "@/components/person-row";
import { formatDayDivider, formatTime, needsDivider } from "@/lib/format";
import { useMarkThreadRead, useSendMessage, useThread, type ThreadMessage } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Button, Text, TextField } from "@/lib/ui";

const ROLE_LABEL: Record<string, string> = { player: "Player", coach: "Coach", club: "Club" };

type ReceiptTone = "ink-400" | "ink-600" | "rust-600";

type ThreadItem =
  | { type: "divider"; id: string; label: string }
  | { type: "message"; id: string; message: ThreadMessage; isFirstOfRun: boolean; isLastOfRun: boolean }
  | { type: "receipt"; id: string; label: string; tone: ReceiptTone; retry: ThreadMessage | null };

/**
 * The state of your last own message, in the one place a chat app shows it.
 * Everything before "Read" is a delivery signal, not a reading one.
 */
function receiptFor(message: ThreadMessage): { label: string; tone: ReceiptTone; retry: ThreadMessage | null } {
  if (message.status === "sending") return { label: "Sending…", tone: "ink-400", retry: null };
  if (message.status === "failed") {
    return { label: "Not delivered · Tap to retry", tone: "rust-600", retry: message };
  }
  if (message.readAt) return { label: `Read ${formatTime(message.readAt)}`, tone: "ink-600", retry: null };
  return { label: "Sent", tone: "ink-600", retry: null };
}

/** Ascending messages → a flat divider/message/receipt list, still ascending. */
function buildThreadItems(messages: ThreadMessage[]): ThreadItem[] {
  const items: ThreadItem[] = [];

  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];

    if (needsDivider(message.createdAt, previous?.createdAt)) {
      items.push({ type: "divider", id: `divider-${message.id}`, label: formatDayDivider(message.createdAt) });
    }

    items.push({
      type: "message",
      id: message.id,
      message,
      isFirstOfRun: !previous || previous.fromMe !== message.fromMe || needsDivider(message.createdAt, previous.createdAt),
      isLastOfRun: !next || next.fromMe !== message.fromMe || needsDivider(next.createdAt, message.createdAt),
    });
  });

  const last = messages[messages.length - 1];
  if (last?.fromMe) {
    items.push({ type: "receipt", id: `receipt-${last.id}`, ...receiptFor(last) });
  }

  return items;
}

export default function Thread() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const router = useRouter();
  const { data, refetch } = useThread(connectionId);
  const markRead = useMarkThreadRead(connectionId);
  const sendMessage = useSendMessage(connectionId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ThreadItem>>(null);
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      // Realtime is best-effort delivery, not a guarantee: this is still the
      // floor under a dropped socket, a topic past the subscription cap, or a
      // connection accepted since the last channel rebuild.
      refetch();
      markRead.mutate();
      return () => {
        focusedRef.current = false;
      };
      // Only on focus — re-running when `refetch`/`markRead` identities
      // change would re-mark-read on every render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionId]),
  );

  const messages = useMemo(() => data?.messages ?? [], [data?.messages]);
  const newestId = messages[messages.length - 1]?.id;

  // Messages can now land while you are looking at the thread. Without this
  // they would sit unread under your nose — lighting the tab badge and denying
  // the sender their receipt. Keyed on the newest id so each arrival re-checks.
  useEffect(() => {
    if (!focusedRef.current || AppState.currentState !== "active") return;
    if (!messages.some((message) => !message.fromMe && !message.readAt)) return;
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestId, connectionId]);

  function send(body: string, tempId?: string) {
    sendMessage.mutate({ body, tempId });
    // Inverted list, so the newest row sits at offset 0.
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    send(body);
  }

  const items = useMemo(() => [...buildThreadItems(messages)].reverse(), [messages]);
  const counterpart = data?.counterpart;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
          <BackChevronIcon />
        </Pressable>
        {counterpart && <PersonAvatar name={counterpart.name} role={counterpart.role} size={36} />}
        <View style={styles.headerBody}>
          <Text variant="body" tone="ink-900" weight="semibold" numberOfLines={1}>
            {counterpart?.name ?? "Conversation"}
          </Text>
          {counterpart?.role && (
            <Text variant="caption" tone="ink-600">
              {ROLE_LABEL[counterpart.role] ?? counterpart.role}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={12}
        style={styles.flex}
      >
        <FlatList
          contentContainerStyle={styles.messages}
          data={items}
          inverted
          keyExtractor={(item) => item.id}
          ref={listRef}
          renderItem={({ item }) => (
            <ThreadRow item={item} onRetry={(message) => send(message.body, message.id)} />
          )}
        />

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextField
              maxLength={4000}
              multiline
              onChangeText={setDraft}
              placeholder="Message…"
              style={styles.composerInput}
              value={draft}
            />
            <Button disabled={!draft.trim()} onPress={handleSend} variant="primary" style={styles.sendButton}>
              Send
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ThreadRow({
  item,
  onRetry,
}: {
  item: ThreadItem;
  onRetry: (message: ThreadMessage) => void;
}) {
  if (item.type === "divider") {
    return (
      <Text variant="micro" tone="ink-600" style={styles.divider}>
        {item.label}
      </Text>
    );
  }

  if (item.type === "receipt") {
    const label = (
      <Text variant="micro" tone={item.tone} style={styles.receipt}>
        {item.label}
      </Text>
    );
    if (!item.retry) return label;
    const failed = item.retry;
    return (
      <Pressable hitSlop={8} onPress={() => onRetry(failed)}>
        {label}
      </Pressable>
    );
  }

  return <Bubble isFirstOfRun={item.isFirstOfRun} isLastOfRun={item.isLastOfRun} message={item.message} />;
}

function Bubble({
  message,
  isFirstOfRun,
  isLastOfRun,
}: {
  message: ThreadMessage;
  isFirstOfRun: boolean;
  isLastOfRun: boolean;
}) {
  const corners = message.fromMe
    ? {
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        borderTopRightRadius: isFirstOfRun ? 20 : 6,
        borderBottomRightRadius: isLastOfRun ? 20 : 6,
      }
    : {
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        borderTopLeftRadius: isFirstOfRun ? 20 : 6,
        borderBottomLeftRadius: isLastOfRun ? 20 : 6,
      };

  return (
    <View style={[styles.bubbleRow, message.fromMe && styles.bubbleRowMe]}>
      <View style={[styles.bubble, message.fromMe ? styles.bubbleMe : styles.bubbleThem, corners]}>
        <Text variant="ui" tone="ink-900">
          {message.body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: colors["cream-200"],
    borderBottomColor: colors["cream-400"],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    height: 56,
    paddingHorizontal: 16,
  },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", marginLeft: -8, width: 40 },
  headerBody: { flex: 1, minWidth: 0 },
  // Inverted list: contentContainerStyle's top/bottom render visually
  // flipped, so paddingBottom here is the visual gap under the header (18)
  // and paddingTop is the visual gap above the composer (8).
  messages: {
    flexGrow: 1,
    gap: 8,
    justifyContent: "flex-end",
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  divider: { paddingVertical: 6, textAlign: "center" },
  receipt: { alignSelf: "flex-end", paddingRight: 6 },
  bubbleRow: { maxWidth: "76%" },
  bubbleRowMe: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: colors["gold-500"] },
  bubbleThem: {
    backgroundColor: colors["cream-50"],
    borderColor: colors["cream-400"],
    borderWidth: StyleSheet.hairlineWidth,
  },
  // SafeAreaView's bottom edge already reserves the device's home-indicator
  // inset — a second big paddingBottom here would double up on top of it.
  composerWrap: { backgroundColor: colors["cream-200"], paddingBottom: 10, paddingHorizontal: 16, paddingTop: 10 },
  composer: {
    alignItems: "center",
    backgroundColor: colors["cream-50"],
    borderColor: colors["cream-400"],
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    height: 46,
    paddingLeft: 16,
    paddingRight: 6,
  },
  composerInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    flex: 1,
    maxHeight: 96,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  sendButton: { borderRadius: 17, height: 34, paddingHorizontal: 15, paddingVertical: 0 },
});

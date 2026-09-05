import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoCard } from "@/components/video-card";
import { errorMessage } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/format";
import { useMe, useRecentFeedback, useVideos } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";
import { Button, Hairline, Notice, PageTitle, Text } from "@/lib/ui";

const CLIPS_SHOWN = 4;

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default function Home() {
  const { signOut } = useSession();
  const me = useMe();
  const { data, isLoading, isError, error, refetch } = useVideos();
  const feedback = useRecentFeedback();
  const videos = data?.videos ?? [];
  const shown = videos.slice(0, CLIPS_SHOWN);
  const comments = feedback.data?.comments ?? [];

  useFocusEffect(
    useCallback(() => {
      refetch();
      me.refetch();
      feedback.refetch();
      // Only re-run on focus, not on every identity change of these.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch]),
  );

  const firstName = me.data?.player?.name.split(" ")[0] ?? me.data?.player?.name ?? "";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.appBar}>
        <View style={styles.wordmark}>
          <Text variant="title" tone="rust-600" weight="display" uppercase style={styles.wordmarkText}>
            Next
          </Text>
          <Text variant="title" tone="amber-500" weight="display" uppercase style={styles.wordmarkText}>
            XI
          </Text>
        </View>
        <View style={styles.appBarRight}>
          <Pressable hitSlop={12} onPress={() => signOut()}>
            <Text variant="caption" tone="rust-600" weight="semibold">
              Sign out
            </Text>
          </Pressable>
          <View style={styles.selfAvatar}>
            <Text variant="caption" tone="ink-900" weight="bold">
              {(firstName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PageTitle>{`${greetingWord()}, ${firstName}`}</PageTitle>

        {isError && <Notice tone="error">{errorMessage(error)}</Notice>}

        <Button style={styles.uploadButton} variant="primary">
          Upload a clip
        </Button>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionTitle>Your clips</SectionTitle>
            {videos.length > 0 && (
              <Text variant="caption" tone="rust-600" weight="semibold">
                All {videos.length} →
              </Text>
            )}
          </View>

          {!isLoading && !isError && videos.length === 0 && (
            <Text variant="ui" tone="ink-600">
              No clips yet.
            </Text>
          )}

          <View style={styles.grid}>
            {shown.map((video, index) => (
              <VideoCard index={index} key={video.id} video={video} width={GRID_CARD_WIDTH} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Coach feedback</SectionTitle>

          {!feedback.isLoading && !feedback.isError && comments.length === 0 && (
            <Text variant="ui" tone="ink-600">
              No coach feedback yet.
            </Text>
          )}

          <View>
            {comments.map((comment, index) => (
              <View key={comment.id}>
                {index > 0 && <Hairline style={styles.feedbackHairline} />}
                <View style={styles.feedbackRow}>
                  <View style={styles.feedbackHeader}>
                    <Text variant="ui" tone="ink-900" weight="semibold">
                      {comment.authorName}
                    </Text>
                    <Text variant="caption" tone="ink-600">
                      {formatRelativeTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text variant="ui" tone="ink-800" style={styles.feedbackBody}>
                    {comment.body}
                  </Text>
                  <Text variant="caption" tone="rust-600" weight="semibold" style={styles.feedbackLink}>
                    {comment.video.originalFilename} →
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Saira Condensed's only loaded weight is Bold, so section heads reuse the display face at body size rather than inventing a 600 weight that isn't there. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="body" tone="ink-900" weight="display" uppercase style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

const GRID_GAP = 14;
const GRID_CARD_WIDTH = "48%" as const;

const styles = StyleSheet.create({
  screen: { backgroundColor: colors["cream-200"], flex: 1 },
  appBar: {
    alignItems: "center",
    borderBottomColor: colors["cream-400"],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 52,
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  wordmark: { flexDirection: "row" },
  wordmarkText: { letterSpacing: 1.7 },
  appBarRight: { alignItems: "center", flexDirection: "row", gap: 12 },
  selfAvatar: {
    alignItems: "center",
    backgroundColor: colors["gold-500"],
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  content: { gap: 8, paddingBottom: 48, paddingHorizontal: 20, paddingTop: 20 },
  uploadButton: { height: 48, marginTop: 4 },
  section: { gap: 12, marginTop: 28 },
  sectionHead: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { letterSpacing: 1.2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  feedbackRow: { gap: 4, paddingVertical: 12 },
  feedbackHairline: { marginTop: 0 },
  feedbackHeader: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  feedbackBody: { lineHeight: 21 },
  feedbackLink: { marginTop: 2 },
});

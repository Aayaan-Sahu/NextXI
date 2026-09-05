import { Image, StyleSheet, View } from "react-native";
import { formatShortDate } from "@/lib/format";
import type { VideoGridItem } from "@/lib/queries";
import { colors } from "@/lib/theme";
import { Text } from "@/lib/ui";

const STATUS_LABEL: Record<VideoGridItem["reportStatus"], string> = {
  PENDING: "Analysing",
  PROCESSING: "Analysing",
  READY: "Report ready",
  FAILED: "Couldn't measure",
  WITH_COACH: "With your coach",
};

/** Report-ready reads gold-on-ink at a stronger overlay, everything else reads muted cream-on-ink at a lighter one. */
const STATUS_TONE: Record<VideoGridItem["reportStatus"], "amber-500" | "cream-200"> = {
  PENDING: "cream-200",
  PROCESSING: "cream-200",
  READY: "amber-500",
  FAILED: "cream-200",
  WITH_COACH: "cream-200",
};

const STATUS_CHIP_BG: Record<VideoGridItem["reportStatus"], string> = {
  PENDING: "rgba(36,28,21,0.6)",
  PROCESSING: "rgba(36,28,21,0.6)",
  READY: "rgba(36,28,21,0.82)",
  FAILED: "rgba(36,28,21,0.6)",
  WITH_COACH: "rgba(36,28,21,0.6)",
};

// Alternates so an untl-thumbnailed grid doesn't read as one flat block.
const PLACEHOLDER_TONES = [colors["olive-800"], colors["olive-700"]] as const;

/**
 * One Home clip-grid card: thumbnail with a status chip overlay, title,
 * date · category. Not wrapped in a Pressable — there's no report-detail
 * screen to open yet (mobile/REMAINING-FEATURES.md), and a tap target that
 * goes nowhere would be a worse experience than none.
 */
type CardWidth = number | `${number}%`;

export function VideoCard({
  video,
  width,
  index = 0,
}: {
  video: VideoGridItem;
  width: CardWidth;
  index?: number;
}) {
  const date = video.uploadedAt ?? video.createdAt;

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.thumbnailWrap}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View
            style={[styles.thumbnail, { backgroundColor: PLACEHOLDER_TONES[index % 2] }]}
          />
        )}
        <View style={[styles.chip, { backgroundColor: STATUS_CHIP_BG[video.reportStatus] }]}>
          <Text variant="micro" tone={STATUS_TONE[video.reportStatus]} weight="semibold">
            {STATUS_LABEL[video.reportStatus]}
          </Text>
        </View>
      </View>
      <View style={styles.caption}>
        <Text variant="ui" tone="ink-900" weight="semibold" numberOfLines={1}>
          {video.tagLabel !== "Untagged" ? video.tagLabel : video.originalFilename}
        </Text>
        <Text variant="caption" tone="ink-600">
          {formatShortDate(date)}
          {video.category ? ` · ${video.category}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7 },
  thumbnailWrap: { position: "relative" },
  thumbnail: { aspectRatio: 16 / 10, backgroundColor: colors["cream-300"], borderRadius: 8, width: "100%" },
  chip: {
    borderRadius: 4,
    left: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: "absolute",
    top: 7,
  },
  caption: { gap: 1 },
});

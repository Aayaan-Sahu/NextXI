#!/usr/bin/env bash
#
# Renders the tutorial compositions and encodes them for the web.
#
# Remotion outputs a large, high-bitrate mp4; the file the browser downloads is
# the second pass. No audio track — these films are captioned, like the
# recording guide, and a silent track is bytes nobody hears.
#
# Prerequisites: a capture per role (scripts/capture-tutorial.mjs) and ffmpeg.
# Usage: bun run video:tutorials [role ...]
set -euo pipefail

cd "$(dirname "$0")/.."

ROLES=("$@")
if [ ${#ROLES[@]} -eq 0 ]; then ROLES=(signup player coach club); fi

mkdir -p out public/tutorials

for ROLE in "${ROLES[@]}"; do
  COMPOSITION="Tutorial-$(tr '[:lower:]' '[:upper:]' <<< "${ROLE:0:1}")${ROLE:1}"
  MASTER="out/tutorial-$ROLE.mp4"

  echo "→ $COMPOSITION"
  bunx remotion render "$COMPOSITION" "$MASTER" --log=error

  # CRF 26 is generous for screen content, which is mostly static frames; the
  # budget that matters is the repo's, and these are committed assets.
  ffmpeg -v error -y -i "$MASTER" \
    -c:v libx264 -profile:v high -crf 26 -preset slow -pix_fmt yuv420p \
    -an -movflags +faststart "public/tutorials/$ROLE.mp4"

  # Poster: a frame from the walkthrough, never the title card — that would
  # only repeat the heading the page prints above it. See poster-frame.py for
  # why it is picked from the caption cues rather than a fixed fraction.
  #
  # A film may name the caption it wants the poster from. The club film's
  # longest-held beat spans two page loads, and a club's roster says what the
  # film is about where a report screen does not.
  case "$ROLE" in
    club) POSTER_CUE="roster is everyone" ;;
    *) POSTER_CUE="" ;;
  esac
  if [ -n "$POSTER_CUE" ]; then
    POSTER_AT=$(python3 scripts/poster-frame.py "remotion/public/captures/$ROLE.json" --cue "$POSTER_CUE")
  else
    POSTER_AT=$(python3 scripts/poster-frame.py "remotion/public/captures/$ROLE.json")
  fi
  ffmpeg -v error -y -ss "$POSTER_AT" -i "$MASTER" -frames:v 1 -q:v 3 "public/tutorials/$ROLE.jpg"

  SIZE=$(du -h "public/tutorials/$ROLE.mp4" | cut -f1)
  echo "  public/tutorials/$ROLE.mp4 ($SIZE)"
done

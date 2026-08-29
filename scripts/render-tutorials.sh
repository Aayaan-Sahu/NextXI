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
if [ ${#ROLES[@]} -eq 0 ]; then ROLES=(player coach); fi

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

  # Poster: a frame from 40% in, which is always mid-walkthrough. The title
  # card would only repeat the heading the page already prints above it; what
  # a reader wants to see is the product.
  DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MASTER")
  POSTER_AT=$(awk -v d="$DURATION" 'BEGIN { printf "%.2f", d * 0.4 }')
  ffmpeg -v error -y -ss "$POSTER_AT" -i "$MASTER" -frames:v 1 -q:v 3 "public/tutorials/$ROLE.jpg"

  SIZE=$(du -h "public/tutorials/$ROLE.mp4" | cut -f1)
  echo "  public/tutorials/$ROLE.mp4 ($SIZE)"
done

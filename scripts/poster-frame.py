"""
Prints the timestamp, in seconds, to grab a tutorial's poster from.

Not a fixed fraction of the running time: that can land mid page-transition
and produce a washed-out frame. A caption cue marks a screen the film is
holding still on, so the poster comes from the longest-held cue — and from the
*end* of it, where whatever the beat was doing has finished. Its start would
catch a half-typed field.

Usage: python3 scripts/poster-frame.py remotion/public/captures/<role>.json
"""

import json
import sys

TITLE_CARD_S = 3.0  # remotion/theme.ts TUTORIAL.title at 30fps
BEFORE_NEXT_S = 1.2  # back from the end of the beat, before the screen changes

manifest = json.load(open(sys.argv[1]))

best = None
offset = TITLE_CARD_S
for segment in manifest["segments"]:
    cues = segment["cues"]
    for index, cue in enumerate(cues):
        nxt = cues[index + 1]["atMs"] if index + 1 < len(cues) else segment["durationMs"]
        held = nxt - cue["atMs"]
        if best is None or held > best[0]:
            best = (held, offset + nxt / 1000 - BEFORE_NEXT_S)
    offset += segment["durationMs"] / 1000

print(f"{best[1]:.2f}")

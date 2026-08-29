"""
Prints the timestamp, in seconds, to grab a tutorial's poster from.

Not a fixed fraction of the running time: that can land mid page-transition
and produce a washed-out frame. A caption cue marks a screen the film is
holding still on, so the poster comes from the longest-held cue — and from the
*end* of it, where whatever the beat was doing has finished. Its start would
catch a half-typed field.

A film whose most-held beat is a page transition can say which caption it
wants instead: pass a substring of that caption and the poster comes from the
end of it. The anchor is the caption text, not a timestamp, so it survives a
re-shoot — and if the caption is gone, this fails rather than guessing.

Usage: python3 scripts/poster-frame.py remotion/public/captures/<role>.json
       python3 scripts/poster-frame.py <manifest> --cue "roster is everyone"
"""

import json
import sys

TITLE_CARD_S = 3.0  # remotion/theme.ts TUTORIAL.title at 30fps
BEFORE_NEXT_S = 1.2  # back from the end of the beat, before the screen changes

manifest = json.load(open(sys.argv[1]))
wanted = sys.argv[3].lower() if len(sys.argv) > 3 and sys.argv[2] == "--cue" else None

best = None
offset = TITLE_CARD_S
for segment in manifest["segments"]:
    cues = segment["cues"]
    for index, cue in enumerate(cues):
        nxt = cues[index + 1]["atMs"] if index + 1 < len(cues) else segment["durationMs"]
        at = offset + nxt / 1000 - BEFORE_NEXT_S
        if wanted:
            if wanted in cue["label"].lower():
                best = (0, at)
        elif best is None or nxt - cue["atMs"] > best[0]:
            best = (nxt - cue["atMs"], at)
    offset += segment["durationMs"] / 1000

if best is None:
    sys.exit(f"No caption matching {sys.argv[3]!r} in {sys.argv[1]}")

print(f"{best[1]:.2f}")

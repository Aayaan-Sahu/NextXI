import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { boil, BoilFilters } from "../boil";
import { COLORS, FONTS, TUTORIAL, TUTORIAL_VIDEO } from "../theme";
import { Paper } from "../ui";
import type { Film } from "./films";

/** One capture: the file, how long it runs, and when each caption lands. */
export type Segment = {
  file: string;
  durationMs: number;
  cues: { atMs: number; label: string }[];
};

export type TutorialProps = Film & { segments: Segment[] };

const msToFrames = (ms: number, fps: number) => Math.max(1, Math.round((ms / 1000) * fps));

/**
 * The whole film: a title card, the captures in order, an end card. The
 * walkthrough is the product's own pixels at 1:1 — nothing here redraws a
 * screen, so a tutorial can never show UI the product doesn't have.
 */
export const Tutorial: React.FC<TutorialProps> = ({
  endLine,
  kicker,
  segments,
  standfirst,
  title,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.pitch950 }}>
      <Series>
        <Series.Sequence durationInFrames={TUTORIAL.title}>
          <TitleCard kicker={kicker} standfirst={standfirst} title={title} />
        </Series.Sequence>
        {segments.map((segment) => (
          <Series.Sequence
            durationInFrames={msToFrames(segment.durationMs, fps)}
            key={segment.file}
          >
            <Walkthrough segment={segment} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TUTORIAL.end}>
          <EndCard line={endLine} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ kicker: string; standfirst: string; title: string }> = ({
  kicker,
  standfirst,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const sub = interpolate(frame, [16, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // The rule draws itself out from the left, the way the scene titles do.
  const rule = interpolate(frame, [10, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 104px" }}>
        <div
          style={{
            color: COLORS.gold600,
            fontFamily: FONTS.display,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.2em",
            opacity: sub,
            textTransform: "uppercase",
            ...boil.b,
          }}
        >
          NextXI · {kicker}
        </div>
        <div
          style={{
            color: COLORS.pitch950,
            fontFamily: FONTS.display,
            fontSize: 82,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 14,
            opacity: rise,
            transform: `translateY(${(1 - rise) * 26}px)`,
            ...boil.a,
          }}
        >
          {title}
        </div>
        <div
          style={{
            backgroundColor: COLORS.rust600,
            height: 5,
            marginTop: 22,
            transform: `scaleX(${rule})`,
            transformOrigin: "left",
            width: 168,
          }}
        />
        <div
          style={{
            color: COLORS.ink600,
            fontFamily: FONTS.sans,
            fontSize: 27,
            marginTop: 22,
            opacity: sub,
          }}
        >
          {standfirst}
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

const EndCard: React.FC<{ line: string }> = ({ line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        backgroundColor: COLORS.pitch950,
        justifyContent: "center",
      }}
    >
      <BoilFilters />
      <div
        style={{
          color: COLORS.cream50,
          fontFamily: FONTS.display,
          fontSize: 54,
          fontWeight: 700,
          maxWidth: 940,
          opacity: rise,
          textAlign: "center",
          transform: `translateY(${(1 - rise) * 18}px)`,
          ...boil.a,
        }}
      >
        {line}
      </div>
      <div
        style={{
          color: COLORS.gold500,
          fontFamily: FONTS.display,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.22em",
          marginTop: 26,
          opacity: interpolate(frame, [12, 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textTransform: "uppercase",
        }}
      >
        nextxi.pro
      </div>
    </AbsoluteFill>
  );
};

/** The capture, plus the lower third and the progress rule over it. */
const Walkthrough: React.FC<{ segment: Segment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(`captures/${segment.file}`)}
        style={{ height: "100%", objectFit: "cover", width: "100%" }}
      />
      {segment.cues.map((cue, index) => {
        const from = msToFrames(cue.atMs, fps);
        const next = segment.cues[index + 1];
        const until = next ? msToFrames(next.atMs, fps) : durationInFrames;
        return (
          <CaptionBand
            from={from}
            key={`${cue.atMs}-${cue.label}`}
            label={cue.label}
            until={Math.min(until, from + TUTORIAL.captionMax)}
          />
        );
      })}
      <div
        style={{
          backgroundColor: COLORS.gold500,
          bottom: 0,
          height: 4,
          left: 0,
          position: "absolute",
          width: `${(frame / durationInFrames) * 100}%`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * A broadcast lower third rather than text floating on the interface: the
 * capture fills the frame, so a caption needs its own ground to stay readable
 * over whatever happens to be underneath it.
 */
const CaptionBand: React.FC<{ from: number; label: string; until: number }> = ({
  from,
  label,
  until,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - from, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [until - 6, until], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < from || frame > until) return null;

  const shown = enter * (1 - exit);

  return (
    <div
      style={{
        backgroundColor: COLORS.pitch950,
        borderTop: `3px solid ${COLORS.gold500}`,
        bottom: 0,
        left: 0,
        opacity: shown,
        padding: "22px 56px 26px",
        position: "absolute",
        right: 0,
        transform: `translateY(${(1 - shown) * 100}%)`,
      }}
    >
      <div
        style={{
          color: COLORS.cream50,
          fontFamily: FONTS.display,
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.15,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const tutorialDurationInFrames = (segments: Segment[], fps = TUTORIAL_VIDEO.fps) =>
  TUTORIAL.title +
  TUTORIAL.end +
  segments.reduce((total, segment) => total + msToFrames(segment.durationMs, fps), 0);

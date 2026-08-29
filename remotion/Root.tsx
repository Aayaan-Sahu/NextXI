import React from "react";
import { Composition, staticFile } from "remotion";
import { RecordingTutorial } from "./RecordingTutorial";
import { Hook } from "./scenes/Hook";
import { Orientation } from "./scenes/Orientation";
import { Batting } from "./scenes/Batting";
import { Bowling } from "./scenes/Bowling";
import { SlowMo } from "./scenes/SlowMo";
import { Recap } from "./scenes/Recap";
import { FILMS } from "./tutorials/films";
import { type Segment, Tutorial, tutorialDurationInFrames } from "./tutorials/Tutorial";
import { SCENES, TOTAL_DURATION, TUTORIAL, TUTORIAL_VIDEO, VIDEO } from "./theme";

const base = {
  width: VIDEO.width,
  height: VIDEO.height,
  fps: VIDEO.fps,
} as const;

const tutorialBase = {
  width: TUTORIAL_VIDEO.width,
  height: TUTORIAL_VIDEO.height,
  fps: TUTORIAL_VIDEO.fps,
} as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="RecordingTutorial"
      component={RecordingTutorial}
      durationInFrames={TOTAL_DURATION}
      {...base}
    />
    {/* Individual scenes registered for quick iteration in the studio */}
    <Composition id="Scene-Hook" component={Hook} durationInFrames={SCENES.hook} {...base} />
    <Composition
      id="Scene-Orientation"
      component={Orientation}
      durationInFrames={SCENES.orientation}
      {...base}
    />
    <Composition
      id="Scene-Batting"
      component={Batting}
      durationInFrames={SCENES.batting}
      {...base}
    />
    <Composition
      id="Scene-Bowling"
      component={Bowling}
      durationInFrames={SCENES.bowling}
      {...base}
    />
    <Composition id="Scene-SlowMo" component={SlowMo} durationInFrames={SCENES.slowmo} {...base} />
    <Composition id="Scene-Recap" component={Recap} durationInFrames={SCENES.recap} {...base} />
    {/* Product tutorials. Length comes from the capture manifest, so a longer
        or shorter take needs no edit here — but a composition will fail to
        resolve until scripts/capture-tutorial.mjs has run for that role. */}
    {Object.values(FILMS).map((film) => (
      <Composition
        calculateMetadata={async ({ props }) => {
          const response = await fetch(staticFile(`captures/${props.role}.json`));
          if (!response.ok) {
            throw new Error(
              `No capture for "${props.role}". Run: bun scripts/capture-tutorial.mjs ${props.role}`,
            );
          }
          const { segments } = (await response.json()) as { segments: Segment[] };
          return {
            durationInFrames: tutorialDurationInFrames(segments, TUTORIAL_VIDEO.fps),
            props: { ...props, segments },
          };
        }}
        component={Tutorial}
        defaultProps={{ ...film, segments: [] as Segment[] }}
        durationInFrames={TUTORIAL.title + TUTORIAL.end}
        id={`Tutorial-${film.role[0].toUpperCase()}${film.role.slice(1)}`}
        key={film.role}
        {...tutorialBase}
      />
    ))}
  </>
);

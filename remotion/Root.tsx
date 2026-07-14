import React from "react";
import { Composition } from "remotion";
import { RecordingTutorial } from "./RecordingTutorial";
import { Hook } from "./scenes/Hook";
import { Orientation } from "./scenes/Orientation";
import { Batting } from "./scenes/Batting";
import { Bowling } from "./scenes/Bowling";
import { SlowMo } from "./scenes/SlowMo";
import { Recap } from "./scenes/Recap";
import { SCENES, TOTAL_DURATION, VIDEO } from "./theme";

const base = {
  width: VIDEO.width,
  height: VIDEO.height,
  fps: VIDEO.fps,
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
  </>
);

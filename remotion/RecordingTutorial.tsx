import React from "react";
import { Series } from "remotion";
import { SCENES } from "./theme";
import { Hook } from "./scenes/Hook";
import { Orientation } from "./scenes/Orientation";
import { Batting } from "./scenes/Batting";
import { Bowling } from "./scenes/Bowling";
import { SlowMo } from "./scenes/SlowMo";
import { Recap } from "./scenes/Recap";

export const RecordingTutorial: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={SCENES.hook}>
      <Hook />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENES.orientation}>
      <Orientation />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENES.batting}>
      <Batting />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENES.bowling}>
      <Bowling />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENES.slowmo}>
      <SlowMo />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENES.recap}>
      <Recap />
    </Series.Sequence>
  </Series>
);

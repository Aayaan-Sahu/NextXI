import type { Metadata } from "next";
import { InfoPage } from "@/components/landing/info-page";
import { TutorialCatalogue } from "@/components/tutorial-catalogue";
import { TUTORIALS } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "Tutorials",
  description:
    "Short films of NextXI as it actually works: uploading a clip and reading the report, and a coach signing one off before it reaches the player.",
};

export default function TutorialsPage() {
  return (
    <InfoPage
      eyebrow="NextXI"
      intro="Every film here is a recording of the real product — no mockups, no narration to follow. None runs longer than two minutes, and all of them are captioned, so they work with the sound off."
      title="Tutorials"
    >
      <TutorialCatalogue tutorials={TUTORIALS} />
    </InfoPage>
  );
}

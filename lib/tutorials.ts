/**
 * The product tutorials: short, silent, captioned films of the real app.
 *
 * They are built by scripts/seed-demo.ts → scripts/capture-tutorial.mjs →
 * remotion/tutorials → scripts/render-tutorials.sh, which is why the copy here
 * has to agree with remotion/tutorials/films.ts: the title card in the film and
 * the heading on the page are the same words.
 */
export type Tutorial = {
  /** Also the file stem: public/tutorials/<id>.mp4 and .jpg. */
  id: "signup" | "player" | "coach";
  title: string;
  /** Who it is for, as a phrase that can follow "For". */
  audience: string;
  length: string;
  blurb: string;
};

export const TUTORIALS: Tutorial[] = [
  {
    id: "signup",
    title: "Creating your account",
    audience: "everyone",
    length: "2 min",
    blurb:
      "One sign-up form, then the profile for whichever kind of account you need. Includes the bit that catches people out: a player under 18 stays closed until their guardian enters the code.",
  },
  {
    id: "player",
    title: "Your first report",
    audience: "players",
    length: "1 min",
    blurb:
      "Tag a clip and upload it, then read what comes back: the three scores, the moment-by-moment timestamps that jump the video, and your coach's sign-off.",
  },
  {
    id: "coach",
    title: "Signing off a report",
    audience: "coaches and scouts",
    length: "1 min",
    blurb:
      "Work through the approval queue: watch at quarter speed, pin feedback to the frame you mean, and release the report and your notes to the player together.",
  },
];

export const tutorialSrc = (id: Tutorial["id"]) => `/tutorials/${id}.mp4`;
export const tutorialPoster = (id: Tutorial["id"]) => `/tutorials/${id}.jpg`;

export function getTutorial(id: Tutorial["id"]) {
  return TUTORIALS.find((tutorial) => tutorial.id === id) ?? null;
}

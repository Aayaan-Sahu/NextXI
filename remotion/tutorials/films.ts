/**
 * What each tutorial says around the capture. The walkthrough itself is the
 * real product, filmed by scripts/capture-tutorial.mjs; this is only the
 * title it opens on and the line it closes with.
 */
export type Film = {
  /** Matches the manifest written to remotion/public/captures/<role>.json. */
  role: string;
  kicker: string;
  title: string;
  /** One line under the title: who it is for, what it covers. */
  standfirst: string;
  endLine: string;
};

export const FILMS: Record<string, Film> = {
  player: {
    role: "player",
    kicker: "For players",
    title: "Your first report",
    standfirst: "Film a shot, get it read, see what to fix.",
    endLine: "Film it. Get it read. Get better.",
  },
  coach: {
    role: "coach",
    kicker: "For coaches and scouts",
    title: "Signing off a report",
    standfirst: "Watch the clip, leave notes on the frame, release it.",
    endLine: "Nothing reaches a player until a coach signs it off.",
  },
};

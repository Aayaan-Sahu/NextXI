import { ImageResponse } from "next/og";

export const alt = "NextXI — AI-backed scouting for young cricketers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#171310",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, rgba(240,200,160,0.04) 0px, rgba(240,200,160,0.04) 1px, transparent 1px, transparent 4px)",
          }}
        />
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#f0c8a0",
            fontWeight: 700,
          }}
        >
          NextXI
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 72,
            lineHeight: 0.98,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: "#fdfbf6",
            fontWeight: 700,
            maxWidth: 900,
          }}
        >
          Cricket talent, seen properly
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            lineHeight: 1.5,
            color: "#e0b0b0",
            maxWidth: 760,
          }}
        >
          AI-backed scouting for young cricketers — measured technique and real footage for the people who pick teams.
        </div>
      </div>
    ),
    { ...size },
  );
}

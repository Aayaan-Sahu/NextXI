import { ImageResponse } from "next/og";

export const alt = "NextXI — AI-backed scouting for young cricketers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#8a2323",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          color: "#fdfbf6",
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "0.06em" }}>
          Next<span style={{ color: "#f0c8a0" }}>XI</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            lineHeight: 1.3,
            color: "#e0b0b0",
            maxWidth: 820,
          }}
        >
          AI-backed scouting for young cricketers
        </div>
      </div>
    ),
    { ...size },
  );
}

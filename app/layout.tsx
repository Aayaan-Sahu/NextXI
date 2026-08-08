import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Public_Sans, Saira_Condensed } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  variable: "--font-saira-condensed",
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "NextXI — AI-backed scouting for young cricketers",
    template: "%s · NextXI",
  },
  description:
    "Film your bowling or batting on a phone and build a profile scouts trust — measured technique and real footage, in front of the people who pick teams.",
  applicationName: "NextXI",
  openGraph: {
    siteName: "NextXI",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#8a2323",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${publicSans.variable} ${sairaCondensed.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-cream-200 font-sans text-ink-900">
        {children}
      </body>
    </html>
  );
}

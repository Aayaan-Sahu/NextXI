import type { Metadata } from "next";
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
  title: "NextXI",
  description: "Cricket player and coach profiles",
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve _next/* assets when opened via the LAN IP
  // (phone/tablet testing), not just localhost. `*` matches one dot-segment,
  // so this covers any device on the 192.168.68.x subnet.
  allowedDevOrigins: ["192.168.68.*"],
  // Old production alias still used as Supabase Site URL / GitHub homepage.
  // Send every path (and query string) to the canonical host so auth emails
  // that still point at cricket-platform-nine.vercel.app actually confirm
  // on www.nextxi.pro, where the session cookie belongs.
  async redirects() {
    const fromVercelApp = {
      has: [{ type: "host" as const, value: "cricket-platform-nine.vercel.app" }],
      permanent: true,
    };

    return [
      { ...fromVercelApp, source: "/", destination: "https://www.nextxi.pro/" },
      {
        ...fromVercelApp,
        source: "/:path*",
        destination: "https://www.nextxi.pro/:path*",
      },
    ];
  },
};

export default nextConfig;

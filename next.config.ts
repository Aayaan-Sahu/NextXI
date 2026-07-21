import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve _next/* assets when opened via the LAN IP
  // (phone/tablet testing), not just localhost. `*` matches one dot-segment,
  // so this covers any device on the 192.168.68.x subnet.
  allowedDevOrigins: ["192.168.68.*"],
};

export default nextConfig;

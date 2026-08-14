import type { MetadataRoute } from "next";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/onboarding", "/api/"],
    },
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
  };
}

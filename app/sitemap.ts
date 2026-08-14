import type { MetadataRoute } from "next";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/auth", "/safeguarding", "/privacy", "/terms", "/contact"];

  return pages.map((path) => ({
    url: `${CANONICAL_SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}

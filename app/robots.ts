import type { MetadataRoute } from "next";

const SITE_URL = "https://monam.mx";

// Only the public marketing/auth surface is crawlable — /admin, /staff, and
// /my hold real client/revenue data behind auth and have no reason to be
// indexed even if a crawler ignored the login redirect.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup", "/forgot-password", "/legal"],
      disallow: ["/admin", "/staff", "/my", "/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

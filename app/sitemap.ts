import type { MetadataRoute } from "next";

const SITE_URL = "https://monam.mx";

// Just the public marketing/legal pages — everything else sits behind auth.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/legal/terminos-y-privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}

import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://reputater.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/write-review`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/leaderboard`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/register`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Fetch business slugs for dynamic routes
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/search?pageSize=50000&sort=rating`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      const businessRoutes: MetadataRoute.Sitemap = (data.results ?? []).map(
        (biz: { slug: string }) => ({
          url: `${BASE_URL}/business/${biz.slug}`,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })
      );
      return [...staticRoutes, ...businessRoutes];
    }
  } catch {
    // Fall back to static routes only
  }

  return staticRoutes;
}

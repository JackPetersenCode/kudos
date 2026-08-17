import type { Metadata } from "next";
import { cache } from "react";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://reputater.com";
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

// cache() dedupes these within a single request, so generateMetadata and the
// layout body share one fetch each instead of refetching.
const getBusiness = cache(async (slug: string) => {
  try {
    const res = await fetch(`${API}/public/business/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

const getReviews = cache(async (businessId: string) => {
  try {
    const res = await fetch(`${API}/public/business/${businessId}/reviews`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return { title: "Business — Reputater" };

  const title = `${business.name} — Reputater`;
  const description =
    business.description ??
    `Discover ${business.name} on Reputater. Read reviews, see what people love, and share your experience.`;
  const location = [business.city, business.state].filter(Boolean).join(", ");
  const canonical = `${SITE_URL}/business/${slug}`;

  return {
    title,
    description: location ? `${description} Located in ${location}.` : description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", siteName: "Reputater", url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BusinessLayout({ params, children }: Props) {
  const { slug } = await params;
  const business = await getBusiness(slug);

  // No data (404 / API down): render the interactive page unchanged.
  if (!business) return <>{children}</>;

  const reviews = business.id ? await getReviews(business.id) : null;
  const reviewCount: number = reviews?.reviewCount ?? 0;
  const averageRating: number | null =
    reviewCount > 0 && typeof reviews?.averageRating === "number" ? reviews.averageRating : null;

  const streetAddress = [business.address1, business.address2].filter(Boolean).join(" ") || undefined;
  const hasAddress = Boolean(business.address1 || business.city || business.state || business.postalCode);
  const location = [business.city, business.state].filter(Boolean).join(", ");

  // schema.org LocalBusiness — drives Google rich results (star snippets, etc.).
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${SITE_URL}/business/${slug}`,
    ...(business.description ? { description: business.description } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.websiteUrl ? { sameAs: [business.websiteUrl] } : {}),
    ...(hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            ...(streetAddress ? { streetAddress } : {}),
            ...(business.city ? { addressLocality: business.city } : {}),
            ...(business.state ? { addressRegion: business.state } : {}),
            ...(business.postalCode ? { postalCode: business.postalCode } : {}),
            addressCountry: "US",
          },
        }
      : {}),
    ...(business.latitude != null && business.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: business.latitude, longitude: business.longitude } }
      : {}),
    ...(averageRating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(averageRating.toFixed(1)),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(Array.isArray(reviews?.reviews) && reviews.reviews.length > 0
      ? {
          review: reviews.reviews.slice(0, 5).map((r: { rating: number; body: string | null; title: string | null; displayName?: string; createdAtUtc?: string }) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            author: { "@type": "Person", name: r.displayName || "Reputater user" },
            ...(r.body || r.title ? { reviewBody: r.body || r.title } : {}),
            ...(r.createdAtUtc ? { datePublished: r.createdAtUtc } : {}),
          })),
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Indexable text for non-JS crawlers. JS visitors get the interactive page below, so this never renders for them (no duplicate content). */}
      <noscript>
        <h1>{business.name}</h1>
        {business.description ? <p>{business.description}</p> : null}
        {location ? <p>Located in {location}.</p> : null}
        {averageRating != null ? (
          <p>
            Rated {averageRating.toFixed(1)} out of 5 from {reviewCount} review{reviewCount === 1 ? "" : "s"} on Reputater.
          </p>
        ) : null}
      </noscript>
      {children}
    </>
  );
}

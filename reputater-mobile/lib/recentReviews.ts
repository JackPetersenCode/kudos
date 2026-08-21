import { apiUrl } from "./api";

export type RecentReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAtUtc: string;
  reviewerName: string;
  reviewPhotoUrl: string | null;
  businessId: string;
  businessName: string;
  slug: string;
  city: string | null;
  state: string | null;
  businessAverageRating: number;
  businessReviewCount: number;
  topCategory: string | null;
  distanceMiles: number | null;
};

export async function getRecentReviews(lat?: number, lng?: number, limit = 20): Promise<RecentReview[]> {
  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  params.set("limit", String(limit));
  try {
    const res = await fetch(apiUrl(`/public/reviews/recent?${params.toString()}`));
    if (!res.ok) return [];
    const data = await res.json();
    return data.reviews ?? [];
  } catch {
    return [];
  }
}

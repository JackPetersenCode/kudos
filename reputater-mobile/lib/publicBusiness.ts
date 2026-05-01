import { apiFetch, apiFetchOptional, apiUrl } from "./api";

export type SearchResult = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  primaryPhotoUrl: string | null;
  reviewCount: number;
  categories: string[];
  isOpenNow: boolean;
  isPremium: boolean;
  isVerified: boolean;
  distanceMiles: number | null;
};

export type AutocompleteBusiness = {
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  reviewCount: number;
  categories: string[];
};

export type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isOpenNow: boolean;
};

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAtUtc: string;
  displayName: string;
  userId: string;
  userEmail: string | null;
  userReviewCount: number;
  positiveTags: string[];
  photos: { id: string; originalUrl: string }[];
  isOwnReview: boolean;
  helpfulCount: number;
  isMarkedHelpful: boolean;
  businessResponse: { body: string; createdAtUtc: string } | null;
  staffRecognitions: {
    staffMemberId: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    tags: string[];
  }[];
};

export async function autocomplete(query: string): Promise<{ businesses: AutocompleteBusiness[] }> {
  const res = await fetch(apiUrl(`/public/autocomplete?q=${encodeURIComponent(query)}`));
  if (!res.ok) return { businesses: [] };
  return res.json();
}

export type SearchCityCount = { city: string; count: number };
export type SearchCategoryCount = { slug: string; name: string; count: number };

export type SearchParams = {
  q?: string;
  where?: string;
  category?: string;
  city?: string;
  price?: number;
  openNow?: boolean;
  reservations?: boolean;
  onlineWaitlist?: boolean;
  delivery?: boolean;
  takeout?: boolean;
  outdoorSeating?: boolean;
  minRating?: number;
  sort?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  page?: number;
  pageSize?: number;
};

export type SearchResponse = {
  results: SearchResult[];
  cityCounts: SearchCityCount[];
  categoryCounts: SearchCategoryCount[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function searchBusinesses(params: SearchParams): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.where?.trim()) qs.set("where", params.where.trim());
  if (params.category?.trim()) qs.set("category", params.category.trim());
  if (params.city?.trim()) qs.set("city", params.city.trim());
  if (params.price) qs.set("price", String(params.price));
  if (params.openNow) qs.set("openNow", "true");
  if (params.reservations) qs.set("reservations", "true");
  if (params.onlineWaitlist) qs.set("onlineWaitlist", "true");
  if (params.delivery) qs.set("delivery", "true");
  if (params.takeout) qs.set("takeout", "true");
  if (params.outdoorSeating) qs.set("outdoorSeating", "true");
  if (params.minRating) qs.set("minRating", String(params.minRating));
  if (params.sort) qs.set("sort", params.sort);
  if (params.lat !== undefined) qs.set("lat", String(params.lat));
  if (params.lng !== undefined) qs.set("lng", String(params.lng));
  if (params.radiusMiles) qs.set("radiusMiles", String(params.radiusMiles));
  if (params.page) qs.set("page", String(params.page));
  qs.set("pageSize", String(params.pageSize ?? 20));

  const res = await fetch(apiUrl(`/public/search?${qs}`));
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return {
    results: data.results ?? [],
    cityCounts: data.cityCounts ?? [],
    categoryCounts: data.categoryCounts ?? [],
    totalCount: data.totalCount ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? 20,
  };
}

export async function getBusiness(slug: string): Promise<PublicBusiness> {
  const res = await fetch(apiUrl(`/public/business/${slug}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBusinessReviews(businessId: string): Promise<{ reviews: Review[]; reviewCount: number }> {
  // Uses apiFetch so the JWT (if present) populates isOwnReview / isMarkedHelpful
  const res = await apiFetchOptional(`/public/business/${businessId}/reviews`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateBusinessReview(
  businessId: string,
  reviewId: string,
  payload: CreateReviewPayload
) {
  const res = await apiFetch(`/public/business/${businessId}/reviews/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteBusinessReview(businessId: string, reviewId: string): Promise<void> {
  await apiFetch(`/public/business/${businessId}/reviews/${reviewId}`, { method: "DELETE" });
}

export async function flagReview(
  businessId: string,
  reviewId: string,
  payload: { reason: string; details?: string | null }
) {
  const res = await apiFetch(`/public/business/${businessId}/reviews/${reviewId}/flag`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function markReviewHelpful(reviewId: string) {
  const res = await apiFetch(`/reviews/${reviewId}/helpful`, { method: "POST" });
  return res.json();
}

export async function unmarkReviewHelpful(reviewId: string) {
  const res = await apiFetch(`/reviews/${reviewId}/helpful`, { method: "DELETE" });
  return res.json();
}

export async function createReviewResponse(businessId: string, reviewId: string, body: string) {
  const res = await apiFetch(`/business/${businessId}/reviews/${reviewId}/response`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function getBusinessPhotos(businessId: string): Promise<{ id: string; originalUrl: string; isPrimary: boolean }[]> {
  const res = await fetch(apiUrl(`/public/business/${businessId}/photos`));
  if (!res.ok) return [];
  return res.json();
}

export type CreateReviewPayload = {
  rating: number;
  title?: string | null;
  body?: string | null;
  positiveTags?: string[];
  photos?: { storageKey: string; originalUrl: string; contentType?: string; sizeBytes?: number }[];
  staffRecognitions?: { staffMemberId: string; tags: string[] }[];
  deletePhotoIds?: string[];
};

export async function createBusinessReview(businessId: string, payload: CreateReviewPayload) {
  const res = await apiFetch(`/public/business/${businessId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function uploadReviewPhoto(file: { uri: string; name: string; type: string }): Promise<{ storageKey: string; originalUrl: string }> {
  const urlRes = await apiFetch("/reviews/photos/upload-url", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });
  const { uploadUrl, storageKey, publicUrl } = await urlRes.json();

  const blob = await (await fetch(file.uri)).blob();
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Failed to upload photo");

  return { storageKey, originalUrl: publicUrl };
}

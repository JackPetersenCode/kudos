import { apiUrl } from "./api";

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
  userReviewCount: number;
  positiveTags: string[];
  photos: { id: string; originalUrl: string }[];
};

export async function autocomplete(query: string): Promise<{ businesses: AutocompleteBusiness[] }> {
  const res = await fetch(apiUrl(`/public/autocomplete?q=${encodeURIComponent(query)}`));
  if (!res.ok) return { businesses: [] };
  return res.json();
}

export async function searchBusinesses(params: { q?: string; where?: string; pageSize?: number }): Promise<{ results: SearchResult[]; totalCount: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.where) qs.set("where", params.where);
  qs.set("pageSize", String(params.pageSize ?? 20));
  const res = await fetch(apiUrl(`/public/search?${qs}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBusiness(slug: string): Promise<PublicBusiness> {
  const res = await fetch(apiUrl(`/public/business/${slug}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBusinessReviews(businessId: string): Promise<{ reviews: Review[]; reviewCount: number }> {
  const res = await fetch(apiUrl(`/public/business/${businessId}/reviews`));
  if (!res.ok) throw new Error(await res.text());
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
};

export async function createBusinessReview(businessId: string, payload: CreateReviewPayload) {
  const { apiFetch } = await import("./api");
  const res = await apiFetch(`/public/business/${businessId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function uploadReviewPhoto(file: { uri: string; name: string; type: string }): Promise<{ storageKey: string; originalUrl: string }> {
  const { apiFetch } = await import("./api");
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

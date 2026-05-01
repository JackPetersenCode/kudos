import { apiFetch, apiUrl } from "./api";

export type PublicAd = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  title: string;
  headline: string | null;
  description: string | null;
  imageUrl: string | null;
  destinationUrl: string;
  campaignId: string;
  placementSlug: string;
  sponsored: true;
} | null;

export async function getPublicAd(params: {
  placementSlug: string;
  category?: string;
  city?: string;
  state?: string;
}): Promise<PublicAd> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.city) qs.set("city", params.city);
  if (params.state) qs.set("state", params.state);
  const res = await fetch(apiUrl(`/public/ads/placement/${encodeURIComponent(params.placementSlug)}?${qs}`));
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text === "null") return null;
  return JSON.parse(text);
}

export async function trackAdImpression(adId: string, placementSlug: string, pagePath?: string) {
  await fetch(apiUrl(`/public/ads/${adId}/impression`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementSlug, pagePath }),
  }).catch(() => {});
}

export async function trackAdClick(adId: string, placementSlug: string, pagePath?: string) {
  await fetch(apiUrl(`/public/ads/${adId}/click`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementSlug, pagePath }),
  }).catch(() => {});
}

export type OwnerAd = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  title: string;
  headline: string | null;
  description: string | null;
  imageUrl: string | null;
  destinationUrl: string;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export async function getMyAds(): Promise<OwnerAd[]> {
  const res = await apiFetch("/ads/mine");
  return res.json();
}

export async function getMyAd(adId: string): Promise<OwnerAd> {
  const res = await apiFetch(`/ads/${adId}`);
  return res.json();
}

export type CreateAdPayload = {
  businessId: string;
  title: string;
  headline?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  destinationUrl: string;
  status?: string;
};

export async function createAd(payload: CreateAdPayload) {
  const res = await apiFetch("/ads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export type UpdateAdPayload = {
  title: string;
  headline?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  destinationUrl: string;
  status: string;
};

export async function updateAd(adId: string, payload: UpdateAdPayload) {
  const res = await apiFetch(`/ads/${adId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteAd(adId: string): Promise<void> {
  await apiFetch(`/ads/${adId}`, { method: "DELETE" });
}

export async function resubmitAd(adId: string) {
  const res = await apiFetch(`/ads/${adId}/resubmit`, { method: "POST" });
  return res.json();
}

export type AdCampaign = {
  id: string;
  adId: string;
  startAtUtc: string;
  endAtUtc: string;
  budgetCents: number;
  pricingModel: string;
  bidCents: number | null;
  isActive: boolean;
  createdAtUtc: string;
};

export async function getAdCampaigns(adId: string): Promise<AdCampaign[]> {
  const res = await apiFetch(`/ads/${adId}/campaigns`);
  return res.json();
}

export type CampaignDetail = AdCampaign & {
  businessId: string;
  businessName: string;
  businessSlug: string;
  placementSlugs: string[];
  targeting: { categorySlug: string | null; city: string | null; state: string | null };
};

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail> {
  const res = await apiFetch(`/ads/campaigns/${campaignId}`);
  return res.json();
}

export type CreateCampaignPayload = {
  startAtUtc: string;
  endAtUtc: string;
  budgetCents: number;
  pricingModel: "cpc" | "cpm" | "flat";
  bidCents?: number | null;
  placementSlugs: string[];
  categorySlug?: string | null;
  city?: string | null;
  state?: string | null;
};

export async function createAdCampaign(adId: string, payload: CreateCampaignPayload) {
  const res = await apiFetch(`/ads/${adId}/campaigns`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateAdCampaign(campaignId: string, payload: CreateCampaignPayload) {
  const res = await apiFetch(`/ads/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function toggleAdCampaign(campaignId: string) {
  const res = await apiFetch(`/ads/campaigns/${campaignId}/toggle`, { method: "POST" });
  return res.json();
}

export type AdPerformance = {
  impressions: number;
  clicks: number;
  ctr: number;
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  pricingModel: string;
  bidCents: number | null;
  byDay: { day: string; eventType: string; count: number }[];
  byPlacement: { placementSlug: string; eventType: string; count: number }[];
};

export async function getAdPerformance(adId: string): Promise<AdPerformance> {
  const res = await apiFetch(`/ads/${adId}/performance`);
  return res.json();
}

export async function uploadAdImage(file: { uri: string; name: string; type: string }): Promise<string> {
  const urlRes = await apiFetch("/ads/upload-image", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });
  const { uploadUrl, publicUrl } = await urlRes.json();
  const blob = await (await fetch(file.uri)).blob();
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Failed to upload image");
  return publicUrl;
}

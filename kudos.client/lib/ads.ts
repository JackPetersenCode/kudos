import { apiFetch } from "./api";

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

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/ads/placement/${encodeURIComponent(
      params.placementSlug
    )}?${qs.toString()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const text = await res.text();
  if (!text) return null;

  return JSON.parse(text);
}

export async function trackAdImpression(adId: string, placementSlug: string, pagePath?: string) {
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/ads/${adId}/impression`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementSlug, pagePath }),
  });
}

export async function trackAdClick(adId: string, placementSlug: string, pagePath?: string) {
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/ads/${adId}/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementSlug, pagePath }),
  });
}

export async function getMyAds(): Promise<OwnerAd[]> {
  const res = await apiFetch("/ads/mine", { method: "GET" });
  return res.json();
}

export async function getMyAd(adId: string): Promise<OwnerAd> {
  const res = await apiFetch(`/ads/${adId}`, { method: "GET" });
  return res.json();
}

export async function createAd(payload: {
  businessId: string;
  title: string;
  headline?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  destinationUrl: string;
  status?: string;
}) {
  const res = await apiFetch("/ads", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function updateAd(
  adId: string,
  payload: {
    title: string;
    headline?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    destinationUrl: string;
    status: string;
  }
) {
  const res = await apiFetch(`/ads/${adId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function createAdCampaign(
  adId: string,
  payload: {
    startAtUtc: string;
    endAtUtc: string;
    budgetCents: number;
    pricingModel: string;
    bidCents?: number | null;
    placementSlugs: string[];
    categorySlug?: string | null;
    city?: string | null;
    state?: string | null;
  }
) {
  const res = await apiFetch(`/ads/${adId}/campaigns`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function getAdminAds(status?: string): Promise<OwnerAd[]> {
  const path = status ? `/admin/ads?status=${encodeURIComponent(status)}` : "/admin/ads";
  const res = await apiFetch(path, { method: "GET" });
  return res.json();
}

export async function getAdminAd(adId: string): Promise<OwnerAd> {
  const res = await apiFetch(`/admin/ads/${adId}`, { method: "GET" });
  return res.json();
}

export async function approveAd(adId: string) {
  const res = await apiFetch(`/admin/ads/${adId}/approve`, { method: "POST" });
  return res.json();
}

export async function rejectAd(adId: string) {
  const res = await apiFetch(`/admin/ads/${adId}/reject`, { method: "POST" });
  return res.json();
}

export async function pauseAd(adId: string) {
  const res = await apiFetch(`/admin/ads/${adId}/pause`, { method: "POST" });
  return res.json();
}

export async function deleteAd(adId: string) {
  const res = await apiFetch(`/ads/${adId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function toggleCampaign(campaignId: string) {
  const res = await apiFetch(`/ads/campaigns/${campaignId}/toggle`, { method: "POST" });
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

export type CampaignDetail = AdCampaign & {
  businessId: string;
  businessName: string;
  businessSlug: string;
  placementSlugs: string[];
  targeting: {
    categorySlug: string | null;
    city: string | null;
    state: string | null;
  };
};

export async function getAdCampaigns(adId: string): Promise<AdCampaign[]> {
  const res = await apiFetch(`/ads/${adId}/campaigns`, { method: "GET" });
  return res.json();
}

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail> {
  const res = await apiFetch(`/ads/campaigns/${campaignId}`, { method: "GET" });
  return res.json();
}

export async function updateCampaignBudget(campaignId: string, budgetCents: number) {
  const res = await apiFetch(`/ads/campaigns/${campaignId}/budget`, {
    method: "PUT",
    body: JSON.stringify({ budgetCents }),
  });
  return res.json();
}

export async function updateCampaign(
  campaignId: string,
  payload: {
    startAtUtc: string;
    endAtUtc: string;
    budgetCents: number;
    pricingModel: string;
    bidCents?: number | null;
    placementSlugs: string[];
    categorySlug?: string | null;
    city?: string | null;
    state?: string | null;
  }
) {
  const res = await apiFetch(`/ads/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
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
  const res = await apiFetch(`/ads/${adId}/performance`, { method: "GET" });
  return res.json();
}

export async function resubmitAd(adId: string): Promise<{
  status: string;
  reviewDecision: string;
  reviewReason: string;
}> {
  const res = await apiFetch(`/ads/${adId}/resubmit`, { method: "POST" });
  return res.json();
}

// Payment
export async function createPaymentHold(campaignId: string): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}> {
  const res = await apiFetch("/payment/create-hold", {
    method: "POST",
    body: JSON.stringify({ campaignId }),
  });
  return res.json();
}

export async function confirmPaymentHold(campaignId: string) {
  const res = await apiFetch("/payment/confirm-hold", {
    method: "POST",
    body: JSON.stringify({ campaignId }),
  });
  return res.json();
}

// Ad image upload
export async function uploadAdImage(file: File): Promise<string> {
  const uploadUrlRes = await apiFetch("/ads/upload-image", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const { uploadUrl, publicUrl } = await uploadUrlRes.json();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload image");
  }

  return publicUrl;
}
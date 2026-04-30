import { apiFetch, apiUrl } from "./api";

export type OwnedBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  createdAtUtc: string;
  membershipRole: string;
};

export async function getOwnedBusinesses(): Promise<OwnedBusiness[]> {
  const res = await apiFetch("/profile/business");
  return res.json();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export type CreateBusinessPayload = {
  name: string;
  slug?: string | null;
  description?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  categorySlugs?: string[];
  priceLevel?: number | null;
  acceptsReservations?: boolean;
  offersOnlineWaitlist?: boolean;
  offersDelivery?: boolean;
  offersTakeout?: boolean;
  outdoorSeating?: boolean;
  timeZone?: string;
  hours?: BusinessHourInput[];
};

export type CreateBusinessResponse = {
  businessId: string;
  name?: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  claimed: boolean;
  message: string;
};

export async function createBusiness(payload: CreateBusinessPayload): Promise<CreateBusinessResponse> {
  const res = await apiFetch("/business", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export type BusinessDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  priceLevel: number | null;
  acceptsReservations: boolean;
  offersOnlineWaitlist: boolean;
  offersDelivery: boolean;
  offersTakeout: boolean;
  outdoorSeating: boolean;
  timeZone: string;
  createdAtUtc: string;
  membershipRole: "owner" | "admin" | "manager";
  categories?: string[];
};

export async function getOwnedBusiness(slug: string): Promise<BusinessDetail> {
  const res = await apiFetch(`/business/${slug}`);
  return res.json();
}

export type BusinessHourInput = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

export type UpdateBusinessPayload = {
  name: string;
  description?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  categorySlugs?: string[];
  priceLevel?: number | null;
  acceptsReservations: boolean;
  offersOnlineWaitlist: boolean;
  offersDelivery: boolean;
  offersTakeout: boolean;
  offersTakeout_legacy?: never;
  outdoorSeating: boolean;
  timeZone: string;
  hours?: BusinessHourInput[];
};

export async function updateBusiness(slug: string, payload: UpdateBusinessPayload) {
  const res = await apiFetch(`/business/${slug}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export type BusinessHours = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

export async function getBusinessHours(businessId: string): Promise<BusinessHours[]> {
  const res = await fetch(apiUrl(`/public/business/${businessId}/hours`));
  if (!res.ok) return [];
  return res.json();
}

export type BusinessAnalytics = {
  totalReviews: number;
  averageRating: number;
  totalCheckIns: number;
  totalFavorites: number;
  reviewsByMonth: { month: string; count: number; averageRating: number }[];
  tagBreakdown: { tagName: string; count: number }[];
  staffLeaderboard: { id: string; firstName: string; lastName: string; kudosCount: number }[];
};

export async function getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
  const res = await apiFetch(`/business/${businessId}/analytics`);
  return res.json();
}

export type OwnerBusinessPhoto = {
  id: string;
  originalUrl: string;
  isPrimary: boolean;
  createdAtUtc: string;
};

export async function getOwnerBusinessPhotos(businessId: string): Promise<OwnerBusinessPhoto[]> {
  const res = await apiFetch(`/business/${businessId}/photos`);
  return res.json();
}

export async function deleteBusinessPhoto(businessId: string, photoId: string): Promise<void> {
  await apiFetch(`/business/${businessId}/photos/${photoId}`, { method: "DELETE" });
}

export async function uploadBusinessPhoto(
  businessId: string,
  file: { uri: string; name: string; type: string; size?: number },
  isPrimary: boolean = false
) {
  const urlRes = await apiFetch(`/business/${businessId}/photos/upload-url`, {
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

  const completeRes = await apiFetch(`/business/${businessId}/photos/complete`, {
    method: "POST",
    body: JSON.stringify({
      storageKey,
      originalUrl: publicUrl,
      contentType: file.type,
      sizeBytes: file.size ?? 0,
      isPrimary,
    }),
  });
  return completeRes.json();
}

export async function createStaffMember(
  businessId: string,
  payload: { firstName: string; lastName: string; role?: string | null; photoUrl?: string | null }
) {
  const res = await apiFetch(`/business/${businessId}/staff`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateStaffMember(
  businessId: string,
  staffId: string,
  payload: { firstName: string; lastName: string; role?: string | null; photoUrl?: string | null }
) {
  const res = await apiFetch(`/business/${businessId}/staff/${staffId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteStaffMember(businessId: string, staffId: string): Promise<void> {
  await apiFetch(`/business/${businessId}/staff/${staffId}`, { method: "DELETE" });
}

export type SeasonalTag = {
  id: string;
  tagName: string;
  expiresAtUtc: string | null;
  createdAtUtc: string;
};

export async function getSeasonalTags(businessId: string): Promise<SeasonalTag[]> {
  // Public endpoint — returns tags for both owners (in dashboard) and visitors (on detail page)
  const res = await fetch(apiUrl(`/public/business/${businessId}/seasonal-tags`));
  if (!res.ok) return [];
  return res.json();
}

export async function createSeasonalTag(
  businessId: string,
  payload: { tagName: string; expiresAtUtc?: string | null }
) {
  const res = await apiFetch(`/business/${businessId}/seasonal-tags`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteSeasonalTag(businessId: string, tagId: string): Promise<void> {
  await apiFetch(`/business/${businessId}/seasonal-tags/${tagId}`, { method: "DELETE" });
}

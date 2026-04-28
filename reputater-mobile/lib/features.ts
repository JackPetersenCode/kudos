import { apiFetch, apiUrl } from "./api";

export async function getFavoriteStatus(businessId: string): Promise<{ isFavorited: boolean }> {
  const res = await apiFetch(`/favorites/${businessId}/status`);
  return res.json();
}

export async function addFavorite(businessId: string) {
  await apiFetch(`/favorites/${businessId}`, { method: "POST" });
}

export async function removeFavorite(businessId: string) {
  await apiFetch(`/favorites/${businessId}`, { method: "DELETE" });
}

export async function checkIn(businessId: string) {
  await apiFetch(`/public/business/${businessId}/checkin`, { method: "POST" });
}

export async function getCheckInCount(businessId: string): Promise<{ totalCheckIns: number; uniqueUsers: number }> {
  const res = await fetch(apiUrl(`/public/business/${businessId}/checkins`));
  if (!res.ok) return { totalCheckIns: 0, uniqueUsers: 0 };
  return res.json();
}

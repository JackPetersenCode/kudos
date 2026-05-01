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

export type Notification = {
  id: string;
  notificationType: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAtUtc: string;
};

export async function getNotifications(): Promise<Notification[]> {
  const res = await apiFetch("/profile/notifications");
  return res.json();
}

export async function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  const res = await apiFetch("/profile/notifications/unread-count");
  return res.json();
}

export async function markNotificationsRead(): Promise<void> {
  await apiFetch("/profile/notifications/mark-read", { method: "POST" });
}

export type Favorite = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  description: string | null;
  primaryPhotoUrl: string | null;
  favoritedAt: string;
  averageRating: number;
  reviewCount: number;
};

export async function getFavorites(): Promise<Favorite[]> {
  const res = await apiFetch("/favorites");
  return res.json();
}

export type FeedItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAtUtc: string;
  businessName: string;
  businessSlug: string;
  reviewerEmail: string;
  eventType: string;
};

export async function getActivityFeed(): Promise<FeedItem[]> {
  const res = await apiFetch("/feed");
  return res.json();
}

export type NotificationPreferences = {
  emailOnNewReview: boolean;
  emailOnReviewResponse: boolean;
  emailOnNewKudos: boolean;
  emailOnFavoriteActivity: boolean;
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiFetch("/profile/notification-preferences");
  return res.json();
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<{ success: boolean }> {
  const res = await apiFetch("/profile/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
  return res.json();
}

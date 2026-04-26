import { apiFetch } from "./api";

// ==========================================
// BOOKMARKS / FAVORITES
// ==========================================

export type FavoriteBusiness = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  description: string | null;
  favoritedAt: string;
  primaryPhotoUrl: string | null;
  averageRating: number;
  reviewCount: number;
};

export async function getFavorites(): Promise<FavoriteBusiness[]> {
  const res = await apiFetch("/favorites", { method: "GET" });
  return res.json();
}

export async function addFavorite(businessId: string) {
  const res = await apiFetch(`/favorites/${businessId}`, { method: "POST" });
  return res.json();
}

export async function removeFavorite(businessId: string) {
  const res = await apiFetch(`/favorites/${businessId}`, { method: "DELETE" });
  return res.json();
}

export async function getFavoriteStatus(businessId: string): Promise<{ isFavorited: boolean }> {
  const res = await apiFetch(`/favorites/${businessId}/status`, { method: "GET" });
  return res.json();
}

// ==========================================
// HELPFUL VOTES
// ==========================================

export async function markReviewHelpful(reviewId: string) {
  const res = await apiFetch(`/reviews/${reviewId}/helpful`, { method: "POST" });
  return res.json();
}

export async function unmarkReviewHelpful(reviewId: string) {
  const res = await apiFetch(`/reviews/${reviewId}/helpful`, { method: "DELETE" });
  return res.json();
}

// ==========================================
// BUSINESS RESPONSES
// ==========================================

export async function createReviewResponse(businessId: string, reviewId: string, body: string) {
  const res = await apiFetch(`/business/${businessId}/reviews/${reviewId}/response`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

// ==========================================
// CHECK-INS
// ==========================================

export async function checkIn(businessId: string) {
  const res = await apiFetch(`/public/business/${businessId}/checkin`, { method: "POST" });
  return res.json();
}

export async function getCheckInCount(businessId: string): Promise<{ totalCheckIns: number; uniqueUsers: number }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/business/${businessId}/checkins`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ==========================================
// BUSINESS CLAIMS
// ==========================================

export async function claimBusiness(businessId: string, verificationNote?: string) {
  const res = await apiFetch(`/public/business/${businessId}/claim`, {
    method: "POST",
    body: JSON.stringify({ verificationNote }),
  });
  return res.json();
}

export async function getAdminClaims() {
  const res = await apiFetch("/admin/claims", { method: "GET" });
  return res.json();
}

export async function approveClaim(claimId: string) {
  const res = await apiFetch(`/admin/claims/${claimId}/approve`, { method: "POST" });
  return res.json();
}

export async function rejectClaim(claimId: string) {
  const res = await apiFetch(`/admin/claims/${claimId}/reject`, { method: "POST" });
  return res.json();
}

// ==========================================
// SEASONAL TAGS
// ==========================================

export type SeasonalTag = {
  id: string;
  tagName: string;
  expiresAtUtc: string | null;
  createdAtUtc: string;
};

export async function getSeasonalTags(businessId: string): Promise<SeasonalTag[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/business/${businessId}/seasonal-tags`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await res.text());
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

export async function deleteSeasonalTag(businessId: string, tagId: string) {
  const res = await apiFetch(`/business/${businessId}/seasonal-tags/${tagId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

// ==========================================
// BADGES
// ==========================================

export type UserBadge = {
  badgeKey: string;
  badgeLabel: string;
  awardedAtUtc: string;
};

export async function getMyBadges(): Promise<UserBadge[]> {
  const res = await apiFetch("/profile/badges", { method: "GET" });
  return res.json();
}

// ==========================================
// ACTIVITY FEED
// ==========================================

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
  const res = await apiFetch("/feed", { method: "GET" });
  return res.json();
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export type Notification = {
  id: string;
  notificationType: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAtUtc: string;
};

export type NotificationPreferences = {
  emailOnNewReview: boolean;
  emailOnReviewResponse: boolean;
  emailOnNewKudos: boolean;
  emailOnFavoriteActivity: boolean;
};

export async function getNotifications(): Promise<Notification[]> {
  const res = await apiFetch("/profile/notifications", { method: "GET" });
  return res.json();
}

export async function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  const res = await apiFetch("/profile/notifications/unread-count", { method: "GET" });
  return res.json();
}

export async function markNotificationsRead() {
  const res = await apiFetch("/profile/notifications/mark-read", { method: "POST" });
  return res.json();
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiFetch("/profile/notification-preferences", { method: "GET" });
  return res.json();
}

export async function updateNotificationPreferences(prefs: NotificationPreferences) {
  const res = await apiFetch("/profile/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
  return res.json();
}

// ==========================================
// BUSINESS ANALYTICS
// ==========================================

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
  const res = await apiFetch(`/business/${businessId}/analytics`, { method: "GET" });
  return res.json();
}

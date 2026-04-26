import { apiFetch } from "./api";

export type PublicBusiness = {
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
  isOpenNow: boolean;
};

export type PublicBusinessPhoto = {
  id: string;
  originalUrl: string;
  isPrimary: boolean;
  createdAtUtc: string;
  uploadedByUserId: string | null;
};

export type BusinessHour = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

export type BusinessReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAtUtc: string;
  userEmail: string;
  positiveTags: string[];
  photos: {
    id: string;
    originalUrl: string;
    createdAtUtc: string;
  }[];
  isOwnReview: boolean;
  helpfulCount: number;
  isMarkedHelpful: boolean;
  displayName: string;
  userId: string;
  userReviewCount: number;
  businessResponse: {
    body: string;
    createdAtUtc: string;
  } | null;
  staffRecognitions: {
    staffMemberId: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    tags: string[];
  }[];
};

export type BusinessReviewsResponse = {
  reviewCount: number;
  averageRating: number;
  categoryClicks: {
    service: number;
    quality: number;
    cleanliness: number;
    value: number;
    experience: number;
  };
  reviews: BusinessReview[];
};

export async function getPublicBusiness(slug: string): Promise<PublicBusiness> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/business/${slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function getPublicBusinessPhotos(
  businessId: string
): Promise<PublicBusinessPhoto[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/business/${businessId}/photos`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function getBusinessHours(
  businessId: string
): Promise<BusinessHour[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/business/${businessId}/hours`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function getBusinessReviews(
  businessId: string
): Promise<BusinessReviewsResponse> {
  const res = await apiFetch(`/public/business/${businessId}/reviews`, {
    method: "GET",
  });

  return res.json();
}

export async function createBusinessReview(
  businessId: string,
  payload: {
    rating: number;
    title?: string | null;
    body?: string | null;
    positiveTags?: string[];
    photos?: {
      storageKey: string;
      originalUrl: string;
      contentType?: string | null;
      sizeBytes?: number | null;
    }[];
    staffRecognitions?: { staffMemberId: string; tags: string[] }[];
  }
) {
  const res = await apiFetch(`/public/business/${businessId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function updateBusinessReview(
  businessId: string,
  reviewId: string,
  payload: {
    rating: number;
    title?: string | null;
    body?: string | null;
    positiveTags?: string[];
    photos?: {
      storageKey: string;
      originalUrl: string;
      contentType?: string | null;
      sizeBytes?: number | null;
    }[];
    deletePhotoIds?: string[];
    staffRecognitions?: { staffMemberId: string; tags: string[] }[];
  }
) {
  const res = await apiFetch(`/public/business/${businessId}/reviews/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return res.json();
}

export async function flagBusinessReview(
  businessId: string,
  reviewId: string,
  reason: string,
  details?: string
) {
  const res = await apiFetch(`/public/business/${businessId}/reviews/${reviewId}/flag`, {
    method: "POST",
    body: JSON.stringify({ reason, details }),
  });
  return res.json();
}

export async function deleteBusinessReview(
  businessId: string,
  reviewId: string
) {
  const res = await apiFetch(`/public/business/${businessId}/reviews/${reviewId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}
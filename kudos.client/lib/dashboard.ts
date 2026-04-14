import { apiFetch } from "./api";

export type DashboardProfilePhoto = {
  id: string;
  originalUrl: string;
  isPrimary: boolean;
  createdAtUtc: string;
} | null;

export type DashboardActivityResponse = {
  recentReviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAtUtc: string;
    businessName: string;
    businessSlug: string;
  }[];
  reviewedCategoryCounts: {
    categoryName: string;
    count: number;
  }[];
  positiveTagTotals: {
    service: number;
    quality: number;
    cleanliness: number;
    value: number;
    experience: number;
  };
};

export async function getProfilePhoto(): Promise<DashboardProfilePhoto> {
  const res = await apiFetch("/profile/photo", {
    method: "GET",
  });

  const text = await res.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

export async function createProfilePhotoUploadUrl(file: File) {
  const res = await apiFetch("/profile/photo/upload-url", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  return res.json();
}

export async function completeProfilePhotoUpload(payload: {
  storageKey: string;
  originalUrl: string;
  contentType?: string | null;
  sizeBytes?: number | null;
}) {
  const res = await apiFetch("/profile/photo/complete", {
    method: "POST",
    body: JSON.stringify({
      storageKey: payload.storageKey,
      originalUrl: payload.originalUrl,
      contentType: payload.contentType ?? null,
      sizeBytes: payload.sizeBytes ?? null,
      isPrimary: true,
    }),
  });

  return res.json();
}

export async function uploadProfilePhoto(file: File) {
  const uploadInfo = await createProfilePhotoUploadUrl(file);

  const uploadRes = await fetch(uploadInfo.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload file to storage");
  }

  return completeProfilePhotoUpload({
    storageKey: uploadInfo.storageKey,
    originalUrl: uploadInfo.publicUrl,
    contentType: file.type,
    sizeBytes: file.size,
  });
}

export async function getDashboardActivity(): Promise<DashboardActivityResponse> {
  const res = await apiFetch("/dashboard/activity", {
    method: "GET",
  });

  return res.json();
}
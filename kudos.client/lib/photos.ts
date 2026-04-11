import { apiFetch } from "./api";

export type BusinessPhoto = {
  id: string;
  originalUrl: string;
  isPrimary: boolean;
  createdAtUtc: string;
};

type UploadUrlResponse = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
};

type CompleteUploadResponse = {
  photoId: string;
  businessId: string;
  originalUrl: string;
  isPrimary: boolean;
};

export async function getBusinessPhotos(
  businessId: string
): Promise<BusinessPhoto[]> {
  const res = await apiFetch(`/businesses/${businessId}/photos`, {
    method: "GET",
  });

  return res.json();
}

export async function uploadBusinessPhoto(
  businessId: string,
  file: File,
  isPrimary: boolean = false
): Promise<CompleteUploadResponse> {
  const uploadUrlRes = await apiFetch(`/businesses/${businessId}/photos/upload-url`, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const uploadInfo: UploadUrlResponse = await uploadUrlRes.json();

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

  const completeRes = await apiFetch(`/businesses/${businessId}/photos/complete`, {
    method: "POST",
    body: JSON.stringify({
      storageKey: uploadInfo.storageKey,
      originalUrl: uploadInfo.publicUrl,
      contentType: file.type,
      sizeBytes: file.size,
      isPrimary,
    }),
  });

  return completeRes.json();
}

export async function deleteBusinessPhoto(
  businessId: string,
  photoId: string
): Promise<void> {
  const res = await apiFetch(`/businesses/${businessId}/photos/${photoId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}
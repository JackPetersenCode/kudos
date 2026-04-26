import { apiFetch } from "./api";

export type UploadedReviewPhoto = {
  storageKey: string;
  originalUrl: string;
  contentType: string;
  sizeBytes: number;
};

export async function uploadReviewPhoto(file: File): Promise<UploadedReviewPhoto> {
  const uploadUrlRes = await apiFetch("/reviews/photos/upload-url", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const uploadInfo = await uploadUrlRes.json();

  const uploadRes = await fetch(uploadInfo.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload review photo");
  }

  return {
    storageKey: uploadInfo.storageKey,
    originalUrl: uploadInfo.publicUrl,
    contentType: file.type,
    sizeBytes: file.size,
  };
}
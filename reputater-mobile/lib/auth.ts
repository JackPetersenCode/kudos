import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./api";

export type Me = {
  userId: string;
  email: string;
  role: string;
  displayName?: string | null;
};

export async function login(email: string, password: string) {
  const res = await apiFetch("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data?.token) {
    await SecureStore.setItemAsync("token", data.token);
    await SecureStore.setItemAsync("userEmail", data.email ?? email);
  }
  return data;
}

export async function register(email: string, password: string) {
  const res = await apiFetch("/Auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, acceptedTerms: true }),
  });
  const data = await res.json();
  if (data?.token) {
    await SecureStore.setItemAsync("token", data.token);
    await SecureStore.setItemAsync("userEmail", data.email ?? email);
  }
  return data;
}

export async function logout() {
  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("userEmail");
}

export async function getStoredToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("token");
}

export async function getMe(): Promise<Me> {
  const res = await apiFetch("/Profile");
  return res.json();
}

export type PublicProfile = {
  userId: string;
  displayName: string;
  joinedAtUtc: string;
  reviewCount: number;
  checkinCount: number;
  badges: { badgeKey: string; badgeLabel: string; awardedAtUtc: string }[];
  recentReviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAtUtc: string;
    businessName: string;
    businessSlug: string;
  }[];
};

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const res = await apiFetch(`/profile/public/${userId}`);
  return res.json();
}

export async function updateDisplayName(displayName: string): Promise<{ displayName: string }> {
  const res = await apiFetch("/profile/display-name", {
    method: "PUT",
    body: JSON.stringify({ displayName }),
  });
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await apiFetch("/Auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch("/Auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  return res.json();
}

export type ProfilePhoto = { id: string; originalUrl: string; isPrimary: boolean; createdAtUtc: string } | null;

export async function getProfilePhoto(): Promise<ProfilePhoto> {
  const res = await apiFetch("/profile/photo");
  const text = await res.text();
  if (!text || text === "null") return null;
  return JSON.parse(text);
}

export async function uploadProfilePhoto(file: { uri: string; name: string; type: string; size?: number }) {
  const urlRes = await apiFetch("/profile/photo/upload-url", {
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

  const completeRes = await apiFetch("/profile/photo/complete", {
    method: "POST",
    body: JSON.stringify({
      storageKey,
      originalUrl: publicUrl,
      contentType: file.type,
      sizeBytes: file.size ?? 0,
    }),
  });
  return completeRes.json();
}

import { apiFetch } from "./api";

export type ProfileResponse = {
  userId: string;
  email: string;
  role: string;
  createdAtUtc: string;
};

export type AccessibleBusiness = {
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
  membershipRole: "owner" | "admin" | "manager";
};

export async function getProfile(): Promise<ProfileResponse> {
  const res = await apiFetch("/Profile");
  return res.json();
}

export async function getAccessibleBusinesses(): Promise<AccessibleBusiness[]> {
  const res = await apiFetch("/Profile/business");
  return res.json();
}
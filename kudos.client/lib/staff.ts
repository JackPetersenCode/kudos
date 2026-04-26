import { apiFetch } from "./api";

export type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAtUtc: string;
  kudosCount: number;
  topTags: { tagName: string; count: number }[];
};

export type StaffKudos = {
  id: string;
  body: string | null;
  createdAtUtc: string;
  userEmail: string;
  tags: string[];
};

export async function getStaffMembers(businessId: string): Promise<StaffMember[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/business/${businessId}/staff`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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

export async function deleteStaffMember(businessId: string, staffId: string) {
  const res = await apiFetch(`/business/${businessId}/staff/${staffId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getStaffKudos(businessId: string, staffId: string): Promise<StaffKudos[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/business/${businessId}/staff/${staffId}/kudos`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createStaffKudos(
  businessId: string,
  staffId: string,
  payload: { body?: string | null; tags?: string[] }
) {
  const res = await apiFetch(`/business/${businessId}/staff/${staffId}/kudos`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

import { apiUrl } from "./api";

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

export async function getStaffMembers(businessId: string): Promise<StaffMember[]> {
  const res = await fetch(apiUrl(`/business/${businessId}/staff`), { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

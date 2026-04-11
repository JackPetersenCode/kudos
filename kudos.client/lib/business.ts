import { apiFetch } from "./api";

export type BusinessHourInput = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
};

export type CreateBusinessRequest = {
  name: string;
  slug?: string | null;
  description?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  categorySlugs?: string[];
  priceLevel?: number | null;
  acceptsReservations?: boolean;
  offersOnlineWaitlist?: boolean;
  offersDelivery?: boolean;
  offersTakeout?: boolean;
  outdoorSeating?: boolean;
  timeZone?: string;
  hours?: BusinessHourInput[];
};

export type CreateBusinessResponse = {
  businessId: string;
  name: string;
  slug: string;
  membershipRole: "owner";
};

export async function createBusiness(
  payload: CreateBusinessRequest
): Promise<CreateBusinessResponse> {
  const res = await apiFetch("/business", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
}
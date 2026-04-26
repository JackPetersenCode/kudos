export type SearchBusinessResult = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryPhotoUrl: string | null;
  averageRating: number;
  reviewCount: number;
  categories: string[];
  isPremium: boolean;
  isVerified: boolean;
  distanceMiles: number | null;
  isOpenNow: boolean;
};

export type SearchCityCount = {
  city: string;
  count: number;
};

export type SearchCategoryCount = {
  slug: string;
  name: string;
  count: number;
};

export type SearchResponse = {
  results: SearchBusinessResult[];
  cityCounts: SearchCityCount[];
  categoryCounts: SearchCategoryCount[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function searchBusinesses(params: {
  q?: string;
  where?: string;
  category?: string;
  city?: string;
  price?: number;
  openNow?: boolean;
  reservations?: boolean;
  onlineWaitlist?: boolean;
  delivery?: boolean;
  takeout?: boolean;
  outdoorSeating?: boolean;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  minRating?: number;
  sort?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  page?: number;
  pageSize?: number;
}): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.where?.trim()) searchParams.set("where", params.where.trim());
  if (params.category?.trim()) searchParams.set("category", params.category.trim());
  if (params.city?.trim()) searchParams.set("city", params.city.trim());
  if (params.price) searchParams.set("price", String(params.price));
  if (params.openNow) searchParams.set("openNow", "true");
  if (params.reservations) searchParams.set("reservations", "true");
  if (params.onlineWaitlist) searchParams.set("onlineWaitlist", "true");
  if (params.delivery) searchParams.set("delivery", "true");
  if (params.takeout) searchParams.set("takeout", "true");
  if (params.outdoorSeating) searchParams.set("outdoorSeating", "true");

  if (params.north !== undefined) searchParams.set("north", String(params.north));
  if (params.south !== undefined) searchParams.set("south", String(params.south));
  if (params.east !== undefined) searchParams.set("east", String(params.east));
  if (params.west !== undefined) searchParams.set("west", String(params.west));
  if (params.minRating) searchParams.set("minRating", String(params.minRating));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.lat !== undefined) searchParams.set("lat", String(params.lat));
  if (params.lng !== undefined) searchParams.set("lng", String(params.lng));
  if (params.radiusMiles) searchParams.set("radiusMiles", String(params.radiusMiles));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/search?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();

  return {
    results: data.results ?? [],
    cityCounts: data.cityCounts ?? [],
    categoryCounts: data.categoryCounts ?? [],
    totalCount: data.totalCount ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? 20,
  };
}
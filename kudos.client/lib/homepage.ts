export type HomepageSlide = {
  mainCategory: {
    name: string;
    slug: string;
  };
  subcategories: {
    name: string;
    slug: string;
  }[];
  featuredBusiness: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    primaryPhotoUrl: string | null;
    averageRating: number;
    reviewCount: number;
    categories: string[];
  } | null;
};

export type HomepageSlidesResponse = {
  slides: HomepageSlide[];
};

export async function getHomepageCategorySlides(): Promise<HomepageSlidesResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/homepage/category-slides`,
    {
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();

  return {
    slides: data.slides ?? [],
  };
}
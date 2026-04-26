import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/business/${slug}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return { title: "Business — Reputater" };
    }

    const business = await res.json();

    const title = `${business.name} — Reputater`;
    const description = business.description
      ?? `Discover ${business.name} on Reputater. Read reviews, see what people love, and share your experience.`;
    const location = [business.city, business.state].filter(Boolean).join(", ");

    return {
      title,
      description: location ? `${description} Located in ${location}.` : description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Reputater",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Business — Reputater" };
  }
}

export default function BusinessLayout({ children }: Props) {
  return <>{children}</>;
}

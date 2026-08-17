import type { Metadata } from "next";

// Server-rendered metadata for the (client-rendered) search page, so search
// engines and social shares get a meaningful title/description instead of the
// generic site default.
export const metadata: Metadata = {
  title: "Search Businesses — Reputater",
  description:
    "Search local businesses on Reputater. Find great places by name, category, or city and read what people love about them.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

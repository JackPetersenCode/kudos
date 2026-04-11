"use client";

import Link from "next/link";

const CATEGORY_LINKS = [
  { name: "Restaurants", slug: "restaurant" },
  { name: "Coffee Shops", slug: "coffee-shop" },
  { name: "Bakeries", slug: "bakery" },
  { name: "Bars", slug: "bar" },
  { name: "Fruit Stands", slug: "fruit-stand" },
  { name: "Florists", slug: "florist" },
  { name: "Gyms", slug: "gym" },
  { name: "Salons", slug: "salon" },
  { name: "Barber Shops", slug: "barber-shop" },
  { name: "Bookstores", slug: "bookstore" },
];

export default function HomeCategoryLinks() {
  return (
    <section style={{ marginTop: 32 }}>
      <h2>Browse by Category</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {CATEGORY_LINKS.map((category) => (
          <Link
            key={category.slug}
            href={`/search?category=${encodeURIComponent(category.slug)}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              border: "1px solid #ddd",
              borderRadius: 999,
              padding: "10px 16px",
              background: "#fff",
            }}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
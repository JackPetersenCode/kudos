"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HomepageSlide } from "@/lib/homepage";

type Props = {
  slides: HomepageSlide[];
};

export default function HomepageCategorySlideshow({ slides }: Props) {
  const [index, setIndex] = useState(0);

  const safeSlides = useMemo(() => slides ?? [], [slides]);

  useEffect(() => {
    if (safeSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeSlides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [safeSlides.length]);

  if (safeSlides.length === 0) {
    return null;
  }

  const slide = safeSlides[index];

  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          borderRadius: 24,
          overflow: "hidden",
          background: "linear-gradient(135deg, #f8f8f8, #efefef)",
          border: "1px solid #e5e5e5",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            minHeight: 500,
          }}
        >
          <div style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  display: "inline-block",
                  marginBottom: 14,
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: "1px solid #d8d8d8",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Featured Category
              </div>

              <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: "0 0 12px 0" }}>
                {slide.mainCategory.name}
              </h1>

              <p style={{ fontSize: 18, color: "#555", maxWidth: 560, marginTop: 0 }}>
                Explore standout businesses and browse subcategories without digging through a crowded directory.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Browse subcategories</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {slide.subcategories.map((subcategory) => (
                  <Link
                    key={subcategory.slug}
                    href={`/search?category=${encodeURIComponent(subcategory.slug)}`}
                    style={{
                      textDecoration: "none",
                      color: "#111",
                      border: "1px solid #d7d7d7",
                      borderRadius: 999,
                      padding: "9px 12px",
                      background: "#fff",
                      fontSize: 14,
                    }}
                  >
                    {subcategory.name}
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <Link
                  href={`/search?category=${encodeURIComponent(slide.mainCategory.slug)}`}
                  style={{
                    textDecoration: "none",
                    color: "#111",
                    fontWeight: 700,
                  }}
                >
                  Browse all {slide.mainCategory.name} →
                </Link>
              </div>
            </div>
          </div>

          <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {slide.featuredBusiness ? (
              <Link
                href={`/business/${slide.featuredBusiness.slug}`}
                style={{
                  width: "100%",
                  maxWidth: 420,
                  textDecoration: "none",
                  color: "#111",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 22,
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    style={{
                      height: 240,
                      background: "#ddd",
                      backgroundImage: slide.featuredBusiness.primaryPhotoUrl
                        ? `url(${slide.featuredBusiness.primaryPhotoUrl})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                      Featured business
                    </div>

                    <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                      {slide.featuredBusiness.name}
                    </div>

                    <div style={{ color: "#555", marginBottom: 10 }}>
                      {[slide.featuredBusiness.city, slide.featuredBusiness.state]
                        .filter(Boolean)
                        .join(", ")}
                    </div>

                    <div style={{ fontWeight: 700, marginBottom: 10 }}>
                      {Number(slide.featuredBusiness.averageRating).toFixed(1)} / 5
                      {" • "}
                      {slide.featuredBusiness.reviewCount} review
                      {slide.featuredBusiness.reviewCount === 1 ? "" : "s"}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {slide.featuredBusiness.categories.map((category) => (
                        <span
                          key={category}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 999,
                            padding: "5px 10px",
                            fontSize: 12,
                            background: "#fafafa",
                          }}
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: 420,
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 22,
                  padding: 28,
                }}
              >
                <h3 style={{ marginTop: 0 }}>No featured business yet</h3>
                <p style={{ color: "#666" }}>
                  As businesses are added to this category, one will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {safeSlides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {safeSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "none",
                background: i === index ? "#111" : "#ccc",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
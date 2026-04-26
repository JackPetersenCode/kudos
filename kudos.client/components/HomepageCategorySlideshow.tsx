"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HomepageSlide } from "@/lib/homepage";
import { getPlaceholderImage } from "@/lib/placeholderImages";

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

  if (safeSlides.length === 0) return null;

  const slide = safeSlides[index];

  return (
    <section style={{ marginTop: 32 }}>
      <div className="slideshow-card">
        <div className="slideshow-grid">
          <div className="slideshow-content">
            <div>
              <span className="tag-accent" style={{ marginBottom: 14, display: "inline-block" }}>
                Featured Category
              </span>

              <h1 className="slideshow-title">{slide.mainCategory.name}</h1>

              <p className="slideshow-desc">
                Explore top-rated businesses and browse subcategories in {slide.mainCategory.name}.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--color-text-secondary)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Subcategories
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slide.subcategories.map((subcategory) => (
                  <Link
                    key={subcategory.slug}
                    href={`/search?category=${encodeURIComponent(subcategory.slug)}`}
                    className="card"
                    style={{ fontSize: 14, padding: "8px 14px" }}
                  >
                    {subcategory.name}
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <Link
                  href={`/search?category=${encodeURIComponent(slide.mainCategory.slug)}`}
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Browse all {slide.mainCategory.name}
                  <span style={{ fontSize: 18 }}>→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="slideshow-featured">
            {slide.featuredBusiness ? (
              <Link
                href={`/business/${slide.featuredBusiness.slug}`}
                style={{ textDecoration: "none", color: "inherit", display: "block", width: "100%", maxWidth: 400 }}
              >
                <div className="featured-card">
                  <div
                    className="featured-img"
                    style={{
                      backgroundImage: `url(${slide.featuredBusiness.primaryPhotoUrl || getPlaceholderImage(slide.featuredBusiness.categories)})`,
                    }}
                  />

                  <div style={{ padding: 20 }}>
                    <span className="tag" style={{ marginBottom: 10, display: "inline-block" }}>
                      Featured
                    </span>

                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                      {slide.featuredBusiness.name}
                    </div>

                    <div style={{ color: "var(--color-text-secondary)", marginBottom: 8, fontSize: 14 }}>
                      {[slide.featuredBusiness.city, slide.featuredBusiness.state]
                        .filter(Boolean)
                        .join(", ")}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 14, fontWeight: 600 }}>
                      <span style={{ color: "var(--color-accent)" }}>
                        {slide.featuredBusiness.reviewCount} reviews
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {slide.featuredBusiness.categories.map((category) => (
                        <span key={category} className="tag">{category}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="featured-card" style={{ padding: 32, textAlign: "center" }}>
                <div className="empty-state">
                  <h3>No featured business yet</h3>
                  <p>Businesses will appear here as they&apos;re added to this category.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {safeSlides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          {safeSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 28 : 10,
                height: 10,
                borderRadius: 999,
                border: "none",
                background: i === index ? "var(--color-accent)" : "var(--color-border)",
                cursor: "pointer",
                transition: "all var(--transition)",
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .slideshow-card {
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
        }
        .slideshow-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          min-height: 460px;
        }
        .slideshow-content {
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .slideshow-title {
          font-size: 40px;
          line-height: 1.05;
          margin: 0 0 12px 0;
          letter-spacing: -0.03em;
        }
        .slideshow-desc {
          font-size: 16px;
          color: var(--color-text-secondary);
          max-width: 480px;
          margin-top: 0;
          line-height: 1.6;
        }
        .slideshow-featured {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
        }
        .featured-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          transition: all var(--transition);
          width: 100%;
          max-width: 400px;
        }
        .featured-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
        .featured-img {
          height: 220px;
          background: var(--color-border);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        @media (max-width: 900px) {
          .slideshow-grid {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .slideshow-title {
            font-size: 30px;
          }
          .slideshow-featured {
            padding: 0 24px 24px;
          }
        }
      `}</style>
    </section>
  );
}

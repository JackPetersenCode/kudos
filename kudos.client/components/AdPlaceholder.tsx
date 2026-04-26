"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PLACEMENT_LABELS: Record<string, string> = {
  "homepage-banner": "Homepage Banner",
  "search-sponsored": "Search Results",
  "business-page": "Business Pages",
  "category-browse": "Category Browse",
  "map-view": "Map View",
};

const SLIDESHOW_IMAGES = [
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
];

type Props = {
  placementSlug: string;
};

export default function AdPlaceholder({ placementSlug }: Props) {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const label = PLACEMENT_LABELS[placementSlug] ?? placementSlug;

  return (
    <div className="placeholder-banner">
      <div className="placeholder-grid">
        <div className="placeholder-slideshow">
          {SLIDESHOW_IMAGES.map((url, i) => (
            <div
              key={url}
              className="placeholder-slide"
              style={{
                backgroundImage: `url(${url})`,
                opacity: i === imgIndex ? 1 : 0,
              }}
            />
          ))}
          <div className="placeholder-overlay">
            <span className="placeholder-overlay-text">Ad Preview</span>
          </div>
        </div>

        <div className="placeholder-body">
          <span className="tag" style={{ marginBottom: 10, display: "inline-block" }}>{label}</span>

          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: "var(--color-text)" }}>
            Your ad could be here
          </div>

          <div style={{ color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6, fontSize: 14 }}>
            Reach customers right when they&apos;re searching.
            Set your own budget, pick your placements, and only pay for results.
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/dashboard/ads/new"
              className="btn-accent"
              style={{ textDecoration: "none", padding: "10px 20px", display: "inline-block" }}
            >
              Create an Ad
            </Link>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Starting at $5/day
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .placeholder-banner {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-bg);
          margin-bottom: 24px;
        }
        .placeholder-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
        }
        .placeholder-slideshow {
          position: relative;
          min-height: 180px;
          overflow: hidden;
        }
        .placeholder-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: opacity 1s ease-in-out;
        }
        .placeholder-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .placeholder-overlay-text {
          color: white;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 14px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: var(--radius-full);
        }
        .placeholder-body {
          padding: 24px;
        }
        @media (max-width: 700px) {
          .placeholder-grid {
            grid-template-columns: 1fr;
          }
          .placeholder-slideshow {
            min-height: 140px;
          }
        }
      `}</style>
    </div>
  );
}

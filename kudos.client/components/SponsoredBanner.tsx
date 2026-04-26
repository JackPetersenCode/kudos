"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicAd, trackAdClick, trackAdImpression, PublicAd } from "@/lib/ads";
import AdPlaceholder from "@/components/AdPlaceholder";

type Props = {
  placementSlug: string;
  category?: string;
  city?: string;
  state?: string;
};

export default function SponsoredBanner({ placementSlug, category, city, state }: Props) {
  const [ad, setAd] = useState<PublicAd>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadAd() {
      try {
        const data = await getPublicAd({ placementSlug, category, city, state });
        setAd(data);
        if (data) {
          await trackAdImpression(data.id, placementSlug, window.location.pathname);
        }
      } catch {
        setAd(null);
      } finally {
        setLoaded(true);
      }
    }
    loadAd();
  }, [placementSlug, category, city, state]);

  if (!loaded) return null;

  // Placeholder when no ad is purchased
  if (!ad) {
    return <AdPlaceholder placementSlug={placementSlug} />;
  }

  const currentAd = ad;

  async function handleClick() {
    await trackAdClick(currentAd.id, placementSlug, window.location.pathname);
  }

  return (
    <div className="sponsored-banner">
      <div className="sponsored-grid">
        {currentAd.imageUrl && (
          <div
            className="sponsored-img"
            style={{ backgroundImage: `url(${currentAd.imageUrl})` }}
          />
        )}

        <div className="sponsored-body">
          <span className="tag" style={{ marginBottom: 10 }}>Sponsored</span>

          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            {currentAd.headline || currentAd.title}
          </div>

          {currentAd.description && (
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
              {currentAd.description}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href={currentAd.destinationUrl}
              onClick={handleClick}
              className="btn-accent"
              style={{ textDecoration: "none", padding: "10px 20px" }}
            >
              Learn More
            </Link>

            <Link
              href={`/business/${currentAd.businessSlug}`}
              onClick={handleClick}
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              View Business →
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sponsored-banner {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-surface);
          margin-bottom: 24px;
        }
        .sponsored-grid {
          display: grid;
          grid-template-columns: ${currentAd.imageUrl ? "260px 1fr" : "1fr"};
        }
        .sponsored-img {
          min-height: 180px;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .sponsored-body {
          padding: 24px;
        }
        @media (max-width: 700px) {
          .sponsored-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

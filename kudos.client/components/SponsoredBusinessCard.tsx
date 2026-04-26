"use client";

import Link from "next/link";
import { trackAdClick, PublicAd } from "@/lib/ads";

type Props = {
  ad: NonNullable<PublicAd>;
};

export default function SponsoredBusinessCard({ ad }: Props) {
  async function handleClick() {
    await trackAdClick(ad.id, ad.placementSlug, window.location.pathname);
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {ad.imageUrl && (
        <div
          style={{
            height: 180,
            backgroundImage: `url(${ad.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      <div style={{ padding: 16 }}>
        <div
          style={{
            display: "inline-block",
            marginBottom: 10,
            borderRadius: 999,
            padding: "5px 10px",
            border: "1px solid #ddd",
            fontSize: 12,
            fontWeight: 700,
            background: "#fafafa",
          }}
        >
          Sponsored
        </div>

        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
          {ad.headline || ad.title}
        </div>

        {ad.description && (
          <div style={{ color: "#555", marginBottom: 12 }}>
            {ad.description}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href={ad.destinationUrl}
            onClick={handleClick}
            style={{
              textDecoration: "none",
              color: "#fff",
              background: "#111",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
            }}
          >
            Visit
          </Link>

          <Link
            href={`/business/${ad.businessSlug}`}
            onClick={handleClick}
            style={{
              textDecoration: "none",
              color: "#111",
              padding: "10px 0",
              fontWeight: 700,
            }}
          >
            View Business
          </Link>
        </div>
      </div>
    </div>
  );
}
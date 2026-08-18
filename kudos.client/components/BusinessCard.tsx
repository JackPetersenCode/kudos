"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { SearchBusinessResult } from "@/lib/search";
import { getPlaceholderImage } from "@/lib/placeholderImages";

type Props = {
  business: SearchBusinessResult;
};

export default function BusinessCard({ business }: Props) {
  const placeholderUrl = getPlaceholderImage(business.categories);
  const photoUrl = business.primaryPhotoUrl?.trim() || placeholderUrl;
  const [src, setSrc] = useState(photoUrl);

  const truncatedDesc = business.description
    ? business.description.length > 100
      ? business.description.slice(0, 100) + "..."
      : business.description
    : null;

  return (
    <Link
      href={`/business/${business.slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div className="biz-card">
        <div className="biz-card-img">
          <img
            src={src}
            alt={business.name}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (src !== placeholderUrl) setSrc(placeholderUrl);
            }}
          />
        </div>

        <div className="biz-card-body">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 className="biz-card-name">{business.name}</h3>
            {business.isVerified && <BadgeCheck size={16} style={{ color: "var(--color-accent)", flexShrink: 0 }} aria-label="Verified" />}
            {business.isPremium && <span className="tag-accent" style={{ fontSize: 10, padding: "2px 6px" }}>Premium</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              className={business.isOpenNow ? "tag-success" : "tag"}
              style={{ fontSize: 11, padding: "2px 8px" }}
            >
              {business.isOpenNow ? "Open" : "Closed"}
            </span>

            {business.reviewCount > 0 && (
              <span className="tag-accent" style={{ fontSize: 11, padding: "2px 8px" }}>
                {business.reviewCount} review{business.reviewCount === 1 ? "" : "s"}
              </span>
            )}

            {business.distanceMiles != null && (
              <span className="tag" style={{ fontSize: 11, padding: "2px 8px" }}>
                {Number(business.distanceMiles) < 1
                  ? `${(Number(business.distanceMiles) * 5280).toFixed(0)} ft`
                  : `${Number(business.distanceMiles).toFixed(1)} mi`}
              </span>
            )}
          </div>

          {business.categories.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {business.categories.slice(0, 3).map((category, i) => (
                <span key={category} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {category}{i < Math.min(business.categories.length, 3) - 1 ? " ·" : ""}
                </span>
              ))}
            </div>
          )}

          {truncatedDesc && (
            <div className="biz-card-desc">{truncatedDesc}</div>
          )}

          <div className="biz-card-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {[business.city, business.state].filter(Boolean).join(", ") || "Location not listed"}
          </div>
        </div>

        <style jsx>{`
          .biz-card {
            border: 1px solid var(--color-border-light);
            border-radius: var(--radius-lg);
            background: var(--color-surface);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            transition: transform var(--transition), box-shadow var(--transition);
            display: grid;
            grid-template-columns: 170px 1fr;
          }
          .biz-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
          }
          .biz-card-img {
            overflow: hidden;
          }
          .biz-card-img img {
            width: 100%;
            height: 100%;
            min-height: 150px;
            object-fit: cover;
            display: block;
          }
          .biz-card-body {
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .biz-card-name {
            margin: 0;
            font-family: var(--font-display);
            font-size: 17px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.25;
            color: var(--color-primary);
          }
          .biz-card-desc {
            color: var(--color-text-secondary);
            font-size: 12px;
            line-height: 1.5;
          }
          .biz-card-location {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--color-text-muted);
            font-size: 12px;
            margin-top: auto;
          }
          @media (max-width: 600px) {
            .biz-card {
              grid-template-columns: 1fr;
            }
            .biz-card-img img {
              height: 160px;
            }
          }
        `}</style>
      </div>
    </Link>
  );
}

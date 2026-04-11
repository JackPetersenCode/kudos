"use client";

import Link from "next/link";
import { SearchBusinessResult } from "@/lib/search";

type Props = {
  business: SearchBusinessResult;
};

export default function BusinessCard({ business }: Props) {
  return (
    <Link
      href={`/business/${business.slug}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gridTemplateColumns: business.primaryPhotoUrl ? "160px 1fr" : "1fr",
          gap: 16,
          cursor: "pointer",
        }}
      >
        {business.primaryPhotoUrl && (
          <img
            src={business.primaryPhotoUrl}
            alt={business.name}
            style={{
              width: 160,
              height: 120,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        )}

        <div>
          <h2 style={{ margin: "0 0 8px 0" }}>{business.name}</h2>

          <div style={{ marginBottom: 8, color: "#555" }}>
            <strong>{Number(business.averageRating).toFixed(1)}</strong> / 5
            {" • "}
            {business.reviewCount} review{business.reviewCount === 1 ? "" : "s"}
          </div>

          {business.categories.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {business.categories.map((category) => (
                <span
                  key={category}
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "#f2f2f2",
                  }}
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          <p style={{ margin: "0 0 8px 0", color: "#555" }}>
            {[business.city, business.state].filter(Boolean).join(", ") || "Location not provided"}
          </p>

          <p style={{ margin: 0 }}>
            {business.description ?? "No description provided."}
          </p>
        </div>
      </div>
    </Link>
  );
}
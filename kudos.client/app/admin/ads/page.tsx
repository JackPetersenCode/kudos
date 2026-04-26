"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminAds, OwnerAd } from "@/lib/ads";

export default function AdminAdsPage() {
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [ads, setAds] = useState<OwnerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAds() {
      try {
        setLoading(true);
        const data = await getAdminAds(statusFilter || undefined);
        setAds(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load ads");
      } finally {
        setLoading(false);
      }
    }

    loadAds();
  }, [statusFilter]);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>Ad Review</h1>
          <div style={{ color: "#666" }}>
            Review, approve, reject, or pause business advertisements.
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 10,
          }}
        >
          <option value="">All</option>
          <option value="pending_review">Pending Review</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading && <div>Loading ads...</div>}

      {error && (
        <div
          style={{
            color: "#b00020",
            background: "#fff5f5",
            border: "1px solid #f0c7c7",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && ads.length === 0 && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 14,
            padding: 20,
            background: "#fff",
          }}
        >
          No ads found.
        </div>
      )}

      {!loading && !error && ads.length > 0 && (
        <div style={{ display: "grid", gap: 16 }}>
          {ads.map((ad) => (
            <Link
              key={ad.id}
              href={`/admin/ads/${ad.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: ad.imageUrl ? "220px 1fr" : "1fr",
                  }}
                >
                  {ad.imageUrl && (
                    <div
                      style={{
                        minHeight: 160,
                        backgroundImage: `url(${ad.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  )}

                  <div style={{ padding: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <strong style={{ fontSize: 20 }}>{ad.title}</strong>

                      <span
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 999,
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#fafafa",
                        }}
                      >
                        {ad.status}
                      </span>
                    </div>

                    {ad.headline && (
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        {ad.headline}
                      </div>
                    )}

                    <div style={{ color: "#555", marginBottom: 8 }}>
                      {ad.businessName}
                    </div>

                    <div style={{ color: "#666", fontSize: 14 }}>
                      Created {new Date(ad.createdAtUtc).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
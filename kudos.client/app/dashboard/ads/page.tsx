"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyAds, deleteAd } from "@/lib/ads";
import { useToast } from "@/components/Toast";

type AdListItem = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  title: string;
  headline: string | null;
  description: string | null;
  imageUrl: string | null;
  destinationUrl: string;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

const statusColors: Record<string, { bg: string; color: string }> = {
  draft: { bg: "var(--color-surface-hover)", color: "var(--color-text-secondary)" },
  pending_review: { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
  active: { bg: "var(--color-success-light)", color: "var(--color-success)" },
  paused: { bg: "var(--color-warning-light)", color: "#e65100" },
  rejected: { bg: "var(--color-danger-light)", color: "var(--color-danger)" },
};

export default function DashboardAdsPage() {
  const { showToast } = useToast();
  const [ads, setAds] = useState<AdListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAds() {
    try {
      const data = await getMyAds();
      setAds(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAds();
  }, []);

  async function handleDelete(adId: string) {
    if (!confirm("Delete this ad? This cannot be undone.")) return;
    try {
      await deleteAd(adId);
      await loadAds();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete ad", "error");
    }
  }

  return (
    <main className="page-container" style={{ maxWidth: 1100 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>My Ads</h1>
          <div style={{ color: "var(--color-text-secondary)" }}>
            Create and manage sponsored placements for your businesses.
          </div>
        </div>

        <Link href="/dashboard/ads/new" className="btn-accent" style={{ textDecoration: "none", padding: "12px 20px" }}>
          Create Ad
        </Link>
      </div>

      {loading && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      )}

      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}

      {!loading && !error && ads.length === 0 && (
        <div className="empty-state">
          <h3>No ads yet</h3>
          <p>Create your first ad to start promoting your business.</p>
        </div>
      )}

      {!loading && !error && ads.length > 0 && (
        <div style={{ display: "grid", gap: 16 }}>
          {ads.map((ad) => {
            const sc = statusColors[ad.status] ?? statusColors.draft;

            return (
              <div key={ad.id} className="section-card" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: ad.imageUrl ? "200px 1fr" : "1fr",
                  }}
                >
                  {ad.imageUrl && (
                    <div
                      style={{
                        minHeight: 160,
                        backgroundImage: `url(${ad.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  )}

                  <div style={{ padding: 18 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                      <Link
                        href={`/dashboard/ads/${ad.id}`}
                        style={{ fontSize: 18, fontWeight: 700, textDecoration: "none", color: "var(--color-text)" }}
                      >
                        {ad.title}
                      </Link>

                      <span
                        style={{
                          borderRadius: "var(--radius-full)",
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          background: sc.bg,
                          color: sc.color,
                        }}
                      >
                        {ad.status.replace("_", " ")}
                      </span>
                    </div>

                    {ad.headline && (
                      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--color-text-secondary)" }}>
                        {ad.headline}
                      </div>
                    )}

                    <div style={{ color: "var(--color-text-secondary)", marginBottom: 6, fontSize: 14 }}>
                      {ad.businessName}
                    </div>

                    <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 12 }}>
                      Created {new Date(ad.createdAtUtc).toLocaleString()}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Link href={`/dashboard/ads/${ad.id}`} className="btn-outline" style={{ textDecoration: "none", padding: "6px 14px", fontSize: 13 }}>
                        View Details
                      </Link>
                      <button onClick={() => handleDelete(ad.id)} className="btn-danger" style={{ padding: "6px 14px", fontSize: 13 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

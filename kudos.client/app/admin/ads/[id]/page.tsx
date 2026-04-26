"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { approveAd, getAdminAd, pauseAd, rejectAd, OwnerAd } from "@/lib/ads";

type Props = {
  params: Promise<{ id: string }>;
};

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: "var(--color-surface-hover)", color: "var(--color-text-secondary)", label: "Draft" },
  pending_review: { bg: "var(--color-warning-light)", color: "var(--color-warning)", label: "Pending Review" },
  active: { bg: "var(--color-success-light)", color: "var(--color-success)", label: "Active" },
  paused: { bg: "var(--color-warning-light)", color: "#e65100", label: "Paused" },
  rejected: { bg: "var(--color-danger-light)", color: "var(--color-danger)", label: "Rejected" },
};

export default function AdminAdDetailPage({ params }: Props) {
  const [adId, setAdId] = useState("");
  const [ad, setAd] = useState<OwnerAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const p = await params;
      setAdId(p.id);
    }
    init();
  }, [params]);

  async function loadAd(id: string) {
    try {
      const data = await getAdminAd(id);
      setAd(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ad");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!adId) return;
    loadAd(adId);
  }, [adId]);

  async function handleAction(action: () => Promise<unknown>) {
    if (!ad) return;
    setActing(true);
    try {
      await action();
      await loadAd(ad.id);
    } finally {
      setActing(false);
    }
  }

  if (loading) return <main className="page-container">Loading ad...</main>;
  if (error) return <main className="page-container"><div className="error-message">{error}</div></main>;
  if (!ad) return <main className="page-container">Ad not found.</main>;

  const sc = statusColors[ad.status] ?? statusColors.draft;

  return (
    <main className="page-container" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/ads">← Back to Ad Review</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>{ad.title}</h1>
          <div style={{ color: "var(--color-text-secondary)" }}>{ad.businessName}</div>
        </div>

        <span style={{ borderRadius: "var(--radius-full)", padding: "8px 16px", fontSize: 14, fontWeight: 700, background: sc.bg, color: sc.color }}>
          {sc.label}
        </span>
      </div>

      {/* AI auto-reviews ads on submission. These are manual overrides for edge cases. */}
      <div className="section-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Manual Override</h3>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 0, fontSize: 14 }}>
          Ads are automatically reviewed by AI on submission. Use these controls only if you need to manually override the AI decision.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ad.status !== "active" && (
            <button onClick={() => handleAction(() => approveAd(ad.id))} disabled={acting} className="btn-accent" style={{ padding: "8px 16px" }}>
              Force Approve
            </button>
          )}
          {ad.status !== "rejected" && (
            <button onClick={() => handleAction(() => rejectAd(ad.id))} disabled={acting} className="btn-danger" style={{ padding: "8px 16px" }}>
              Force Reject
            </button>
          )}
          {ad.status === "active" && (
            <button onClick={() => handleAction(() => pauseAd(ad.id))} disabled={acting} className="btn-outline" style={{ padding: "8px 16px" }}>
              Pause
            </button>
          )}
          {ad.status === "paused" && (
            <button onClick={() => handleAction(() => approveAd(ad.id))} disabled={acting} className="btn-accent" style={{ padding: "8px 16px" }}>
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="section-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: ad.imageUrl ? "280px 1fr" : "1fr" }}>
          {ad.imageUrl && (
            <div style={{ minHeight: 220, backgroundImage: `url(${ad.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          )}

          <div style={{ padding: 24 }}>
            {ad.headline && (
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{ad.headline}</div>
            )}

            {ad.description && (
              <div style={{ color: "var(--color-text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>{ad.description}</div>
            )}

            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>
                <strong>Destination:</strong>{" "}
                <span style={{ wordBreak: "break-all", color: "var(--color-text-secondary)" }}>{ad.destinationUrl}</span>
              </div>
              <div>
                <strong>Business:</strong>{" "}
                <Link href={`/business/${ad.businessSlug}`}>{ad.businessName}</Link>
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 8 }}>
                Created {new Date(ad.createdAtUtc).toLocaleString()} | Updated {new Date(ad.updatedAtUtc).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

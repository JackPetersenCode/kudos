"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  getMyAd,
  getAdCampaigns,
  getAdPerformance,
  deleteAd,
  toggleCampaign,
  resubmitAd,
  updateCampaignBudget,
  OwnerAd,
  AdCampaign,
  AdPerformance,
} from "@/lib/ads";

type Props = {
  params: Promise<{ id: string }>;
};

export default function DashboardAdDetailPage({ params }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [adId, setAdId] = useState("");
  const [ad, setAd] = useState<OwnerAd | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [performance, setPerformance] = useState<AdPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      const p = await params;
      setAdId(p.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (!adId) return;

    async function loadAll() {
      try {
        const [adData, campaignData, perfData] = await Promise.all([
          getMyAd(adId),
          getAdCampaigns(adId),
          getAdPerformance(adId).catch(() => null),
        ]);
        setAd(adData);
        setCampaigns(campaignData);
        setPerformance(perfData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load ad");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [adId]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this ad? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteAd(adId);
      router.push("/dashboard/ads");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete ad", "error");
      setDeleting(false);
    }
  }

  async function handleToggleCampaign(campaignId: string) {
    try {
      await toggleCampaign(campaignId);
      const updated = await getAdCampaigns(adId);
      setCampaigns(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: "#f5f5f5", color: "#666" },
    pending_review: { bg: "#fff8e1", color: "#b8860b" },
    active: { bg: "#edf8ef", color: "#1e7a36" },
    paused: { bg: "#fff3e0", color: "#e65100" },
    rejected: { bg: "#ffeef0", color: "#d32f2f" },
  };

  if (loading) return <main style={{ padding: 24 }}>Loading ad...</main>;

  if (error)
    return (
      <main style={{ padding: 24 }}>
        <pre style={{ color: "red" }}>{error}</pre>
        <Link href="/dashboard/ads">← Back to Ads</Link>
      </main>
    );

  if (!ad) return <main style={{ padding: 24 }}>Ad not found.</main>;

  const sc = statusColors[ad.status] ?? statusColors.draft;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard/ads">← Back to Ads</Link>
      </div>

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
          <h1 style={{ marginBottom: 8 }}>{ad.title}</h1>
          <div style={{ color: "#666" }}>
            <Link href={`/dashboard/business/${ad.businessSlug}`}>{ad.businessName}</Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/dashboard/ads/${ad.id}/edit`}
            style={{
              textDecoration: "none",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: 10,
              padding: "10px 16px",
              fontWeight: 700,
            }}
          >
            Edit Ad
          </Link>
          {(ad.status === "rejected" || ad.status === "draft") && (
            <button
              onClick={async () => {
                setResubmitting(true);
                try {
                  const result = await resubmitAd(ad.id);
                  if (result.reviewDecision === "reject") {
                    showToast(`Still rejected.\n\nReason: ${result.reviewReason}\n\nEdit your ad content and try again.`, "error");
                  } else {
                    showToast("Your ad has been approved and is now live!", "success");
                  }
                  const [updatedAd, updatedPerf] = await Promise.all([
                    getMyAd(adId),
                    getAdPerformance(adId).catch(() => null),
                  ]);
                  setAd(updatedAd);
                  setPerformance(updatedPerf);
                } catch (err) {
                  showToast(err instanceof Error ? err.message : "Could not resubmit", "error");
                } finally {
                  setResubmitting(false);
                }
              }}
              disabled={resubmitting}
              className="btn-accent"
              style={{ padding: "10px 16px" }}
            >
              {resubmitting ? "Reviewing..." : "Re-submit for Review"}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger"
            style={{ padding: "10px 16px" }}
          >
            {deleting ? "Deleting..." : "Delete Ad"}
          </button>
        </div>
      </div>

      {/* Ad Preview */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ad.imageUrl ? "280px 1fr" : "1fr",
          }}
        >
          {ad.imageUrl && (
            <div
              style={{
                minHeight: 220,
                backgroundImage: `url(${ad.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div style={{ padding: 20 }}>
            <span
              style={{
                display: "inline-block",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 12,
                background: sc.bg,
                color: sc.color,
              }}
            >
              {ad.status.replace("_", " ")}
            </span>

            {ad.headline && (
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{ad.headline}</div>
            )}
            {ad.description && (
              <div style={{ color: "#555", marginBottom: 14 }}>{ad.description}</div>
            )}
            <div style={{ marginBottom: 8 }}>
              <strong>Destination:</strong>{" "}
              <span style={{ wordBreak: "break-all" }}>{ad.destinationUrl}</span>
            </div>
            <div style={{ color: "#666", fontSize: 14 }}>
              Created {new Date(ad.createdAtUtc).toLocaleString()} | Updated{" "}
              {new Date(ad.updatedAtUtc).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* Performance */}
      {performance && (
        <section style={{ marginBottom: 24 }}>
          <h2>Performance</h2>
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-value">{performance.impressions}</div>
              <div className="stat-label">Impressions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{performance.clicks}</div>
              <div className="stat-label">Clicks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{performance.ctr}%</div>
              <div className="stat-label">Click-Through Rate</div>
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-value">${(performance.budgetCents / 100).toFixed(2)}</div>
              <div className="stat-label">Budget</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${(performance.spentCents / 100).toFixed(2)}</div>
              <div className="stat-label">Spent</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: performance.remainingCents > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                ${(performance.remainingCents / 100).toFixed(2)}
              </div>
              <div className="stat-label">Remaining</div>
            </div>
          </div>

          <div className="section-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14, color: "var(--color-text-secondary)" }}>
              <span><strong>Pricing:</strong> {performance.pricingModel.toUpperCase()}</span>
              {performance.bidCents != null && (
                <span><strong>Bid:</strong> ${(performance.bidCents / 100).toFixed(2)} per {performance.pricingModel === "cpc" ? "click" : "1,000 impressions"}</span>
              )}
              {performance.budgetCents > 0 && (
                <span><strong>Budget used:</strong> {Math.min(100, Math.round(performance.spentCents / performance.budgetCents * 100))}%</span>
              )}
            </div>
          </div>

          {performance.byPlacement.length > 0 && (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3 style={{ marginTop: 0 }}>By Placement</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {performance.byPlacement.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #eee",
                      paddingBottom: 6,
                    }}
                  >
                    <span>
                      {item.placementSlug} - {item.eventType}
                    </span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Campaigns */}
      <section>
        <h2>Campaigns</h2>

        {campaigns.length === 0 ? (
          <p>No campaigns created yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: campaign.isActive ? "#edf8ef" : "#f5f5f5",
                      color: campaign.isActive ? "#1e7a36" : "#666",
                    }}
                  >
                    {campaign.isActive ? "Active" : "Paused"}
                  </span>
                  <button
                    onClick={() => handleToggleCampaign(campaign.id)}
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                      background: "#fff",
                    }}
                  >
                    {campaign.isActive ? "Pause" : "Resume"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <strong>Start:</strong>{" "}
                    {new Date(campaign.startAtUtc).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>End:</strong>{" "}
                    {new Date(campaign.endAtUtc).toLocaleDateString()}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>Budget:</strong> ${(campaign.budgetCents / 100).toFixed(2)}
                    <button
                      className="btn-ghost"
                      style={{ padding: "2px 8px", fontSize: 12 }}
                      onClick={async () => {
                        const input = prompt(
                          "Enter new budget in cents (e.g. 5000 = $50.00):",
                          String(campaign.budgetCents)
                        );
                        if (!input) return;
                        const newBudget = parseInt(input, 10);
                        if (isNaN(newBudget) || newBudget <= 0) {
                          showToast("Invalid budget amount.", "error");
                          return;
                        }
                        try {
                          await updateCampaignBudget(campaign.id, newBudget);
                          const updated = await getAdCampaigns(adId);
                          setCampaigns(updated);
                          const updatedPerf = await getAdPerformance(adId).catch(() => null);
                          setPerformance(updatedPerf);
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Failed to update budget", "error");
                        }
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div>
                    <strong>Pricing:</strong> {campaign.pricingModel}
                    {campaign.bidCents != null && ` ($${(campaign.bidCents / 100).toFixed(2)} bid)`}
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 13, color: "#888" }}>
                  Created {new Date(campaign.createdAtUtc).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

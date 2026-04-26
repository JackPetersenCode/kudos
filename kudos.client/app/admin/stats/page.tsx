"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";

type SiteStats = {
  totalUsers: number;
  usersLast30Days: number;
  totalBusinesses: number;
  importedBusinesses: number;
  userCreatedBusinesses: number;
  premiumBusinesses: number;
  totalReviews: number;
  reviewsLast30Days: number;
  totalAds: number;
  activeAds: number;
  totalAdRevenueCents: number;
  totalCheckIns: number;
  totalFavorites: number;
  totalStaffKudos: number;
  pendingClaims: number;
  totalAdImpressions: number;
  totalAdClicks: number;
  reviewsByMonth: { month: string; count: number }[];
  usersByMonth: { month: string; count: number }[];
};

function StatsContent() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/admin/stats", { method: "GET" });
        setStats(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load stats");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <main className="page-container"><div className="skeleton" style={{ height: 400 }} /></main>;
  if (error) return <main className="page-container"><div className="error-message">{error}</div></main>;
  if (!stats) return null;

  return (
    <main className="page-container" style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>

      <h1 style={{ marginBottom: 24 }}>Site Analytics</h1>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalBusinesses}</div>
          <div className="stat-label">Total Businesses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalReviews}</div>
          <div className="stat-label">Total Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${(stats.totalAdRevenueCents / 100).toFixed(0)}</div>
          <div className="stat-label">Ad Revenue</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.usersLast30Days}</div>
          <div className="stat-label">New Users (30d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.reviewsLast30Days}</div>
          <div className="stat-label">New Reviews (30d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeAds}</div>
          <div className="stat-label">Active Ads</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingClaims}</div>
          <div className="stat-label">Pending Claims</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="section-card">
          <h2>Reviews by Month</h2>
          {stats.reviewsByMonth.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>No data yet</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {stats.reviewsByMonth.map((item) => (
                <div key={item.month} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border-light)", paddingBottom: 6 }}>
                  <span>{item.month}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card">
          <h2>User Growth</h2>
          {stats.usersByMonth.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>No data yet</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {stats.usersByMonth.map((item) => (
                <div key={item.month} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border-light)", paddingBottom: 6 }}>
                  <span>{item.month}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="section-card">
          <h2>Businesses</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Imported</span><strong>{stats.importedBusinesses}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>User Created</span><strong>{stats.userCreatedBusinesses}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Premium</span><strong>{stats.premiumBusinesses}</strong>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h2>Engagement</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Check-Ins</span><strong>{stats.totalCheckIns}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Favorites</span><strong>{stats.totalFavorites}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Staff Reviews</span><strong>{stats.totalStaffKudos}</strong>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h2>Advertising</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Total Ads</span><strong>{stats.totalAds}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Impressions</span><strong>{stats.totalAdImpressions}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Clicks</span><strong>{stats.totalAdClicks}</strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminStatsPage() {
  return (
    <RequireAuth>
      <StatsContent />
    </RequireAuth>
  );
}

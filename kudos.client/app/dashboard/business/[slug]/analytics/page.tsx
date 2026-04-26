"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getBusinessAnalytics, BusinessAnalytics } from "@/lib/features";
import RequireAuth from "@/components/RequireAuth";

function AnalyticsContent() {
  const params = useParams();
  const slug = params.slug as string;

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/business/${slug}`, { method: "GET" });
        const biz = await res.json();
        setBusinessId(biz.id);
        setBusinessName(biz.name);

        const data = await getBusinessAnalytics(biz.id);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load analytics");
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  if (loading) return <main style={{ padding: 24 }}>Loading analytics...</main>;
  if (error) return <main style={{ padding: 24 }}><pre style={{ color: "red" }}>{error}</pre></main>;
  if (!analytics) return <main style={{ padding: 24 }}>No data available.</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/dashboard/business/${slug}`}>← Back to business</Link>
      </div>

      <h1>{businessName} - Analytics</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{analytics.totalReviews}</div>
          <div style={{ color: "#666" }}>Total Reviews</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{Number(analytics.averageRating).toFixed(1)}</div>
          <div style={{ color: "#666" }}>Average Rating</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{analytics.totalCheckIns}</div>
          <div style={{ color: "#666" }}>Check-Ins</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{analytics.totalFavorites}</div>
          <div style={{ color: "#666" }}>Favorites</div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Reviews by Month</h2>
          {analytics.reviewsByMonth.length === 0 ? (
            <p>No review data yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {analytics.reviewsByMonth.map((item) => (
                <div
                  key={item.month}
                  style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: 6 }}
                >
                  <span>{item.month}</span>
                  <span>
                    <strong>{item.count}</strong> reviews (avg {Number(item.averageRating).toFixed(1)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Top Positive Tags</h2>
          {analytics.tagBreakdown.length === 0 ? (
            <p>No tag data yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {analytics.tagBreakdown.map((item) => (
                <div
                  key={item.tagName}
                  style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: 6 }}
                >
                  <span style={{ textTransform: "capitalize" }}>{item.tagName}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {analytics.staffLeaderboard.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2>Staff Leaderboard</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {analytics.staffLeaderboard.map((member, index) => (
              <div
                key={member.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <strong>#{index + 1}</strong> {member.firstName} {member.lastName}
                </span>
                <span style={{ fontWeight: 700 }}>{member.kudosCount} reviews</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AnalyticsContent />
    </RequireAuth>
  );
}

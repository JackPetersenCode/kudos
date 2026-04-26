"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActivityFeed, FeedItem } from "@/lib/features";
import RequireAuth from "@/components/RequireAuth";

function FeedContent() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getActivityFeed();
        setFeed(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <main style={{ padding: 24 }}>Loading feed...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>

      <h1>Activity Feed</h1>
      <p style={{ color: "#666" }}>
        Recent reviews from businesses you&apos;ve saved.
      </p>

      {feed.length === 0 ? (
        <p>No activity yet. Save some businesses to see their reviews here!</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {feed.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <Link
                  href={`/business/${item.businessSlug}`}
                  style={{ textDecoration: "none", color: "#111", fontWeight: 700 }}
                >
                  {item.businessName}
                </Link>
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>{item.rating}/5</strong> by {item.reviewerEmail}
              </div>
              {item.title && (
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              )}
              {item.body && (
                <div style={{ color: "#555", marginBottom: 8 }}>{item.body}</div>
              )}
              <small style={{ color: "#888" }}>
                {new Date(item.createdAtUtc).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function FeedPage() {
  return (
    <RequireAuth>
      <FeedContent />
    </RequireAuth>
  );
}

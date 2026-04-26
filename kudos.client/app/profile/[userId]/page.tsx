"use client";

import { useEffect, useState } from "react";
import { getTaterLevel } from "@/lib/taterLevel";
import { useParams } from "next/navigation";
import Link from "next/link";

type PublicProfile = {
  userId: string;
  displayName: string;
  joinedAtUtc: string;
  reviewCount: number;
  checkinCount: number;
  badges: { badgeKey: string; badgeLabel: string; awardedAtUtc: string }[];
  recentReviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAtUtc: string;
    businessName: string;
    businessSlug: string;
  }[];
};

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/Profile/public/${userId}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());
        setProfile(await res.json());
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    if (userId) load();
  }, [userId]);

  if (loading) {
    return (
      <main className="page-container-medium">
        <div className="skeleton" style={{ height: 200 }} />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page-container-medium">
        <div className="empty-state">
          <h3>User not found</h3>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container-medium">
      <div className="section-card" style={{ marginBottom: 24, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "var(--color-accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--color-accent)",
            flexShrink: 0,
          }}
        >
          {profile.displayName[0]?.toUpperCase()}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>{profile.displayName}</h1>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, padding: "4px 12px", borderRadius: 999,
              background: "var(--color-accent-light)", color: "var(--color-accent)",
              fontWeight: 700,
            }}>
              <img src={getTaterLevel(profile.reviewCount).image} alt="" width={22} height={22} style={{ objectFit: "contain" }} />
              {getTaterLevel(profile.reviewCount).name}
            </span>
          </div>
          <div style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 4 }}>
            Joined {new Date(profile.joinedAtUtc).toLocaleDateString()}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontWeight: 600 }}>{profile.reviewCount} reviews</span>
            <span style={{ fontWeight: 600 }}>{profile.checkinCount} check-ins</span>
          </div>
        </div>
      </div>

      {profile.badges.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20 }}>Badges</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {profile.badges.map((badge) => (
              <div
                key={badge.badgeKey}
                className="tag-accent"
                style={{ padding: "8px 14px", fontSize: 13 }}
              >
                {badge.badgeLabel}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 20 }}>Recent Reviews</h2>

        {profile.recentReviews.length === 0 ? (
          <div className="empty-state">
            <p>No reviews yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {profile.recentReviews.map((review) => (
              <div key={review.id} className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Link href={`/business/${review.businessSlug}`} style={{ fontWeight: 700 }}>
                    {review.businessName}
                  </Link>
                  <span className="tag-accent" style={{ fontSize: 12 }}>review</span>
                </div>

                {review.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{review.title}</div>}
                {review.body && <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{review.body}</div>}

                <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-text-muted)" }}>
                  {new Date(review.createdAtUtc).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe, logout } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  getDashboardActivity,
  getProfilePhoto,
  uploadProfilePhoto,
} from "@/lib/dashboard";
import { getMyBadges, UserBadge } from "@/lib/features";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";

type MeResponse = {
  userId: string;
  email: string;
  role: string;
  createdAtUtc: string;
};

type OwnedBusiness = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  membershipRole: string;
};

function DashboardContent() {
  const router = useRouter();
  const { token, isReady, isAuthenticated } = useAuth();

  const [me, setMe] = useState<(MeResponse & { displayName?: string | null }) | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [reviewedCategoryCounts, setReviewedCategoryCounts] = useState<any[]>([]);
  const [positiveTagTotals, setPositiveTagTotals] = useState({
    service: 0,
    quality: 0,
    cleanliness: 0,
    value: 0,
    experience: 0,
  });

  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(activeToken: string) {
    setError("");

    try {
      const [meData, businessesRes, photoData, activityData, badgesData] = await Promise.all([
        getMe(),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profile/business`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
          cache: "no-store",
        }).then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        }),
        getProfilePhoto(),
        getDashboardActivity(),
        getMyBadges().catch(() => []),
      ]);

      setMe(meData);
      setBusinesses(businessesRes ?? []);
      setProfilePhotoUrl(photoData?.originalUrl ?? null);
      setBadges(badgesData);
      setRecentReviews(activityData.recentReviews ?? []);
      setReviewedCategoryCounts(activityData.reviewedCategoryCounts ?? []);
      setPositiveTagTotals(
        activityData.positiveTagTotals ?? {
          service: 0,
          quality: 0,
          cleanliness: 0,
          value: 0,
          experience: 0,
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !token) return;

    loadDashboard(token);
  }, [isReady, isAuthenticated, token]);

  async function handleProfilePhotoChange(file: File | null) {
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    try {
      await uploadProfilePhoto(file);
      const photo = await getProfilePhoto();
      setProfilePhotoUrl(photo?.originalUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (loading) {
    return <main style={{ minHeight: "100vh" }} />;
  }

  return (
    <main className="page-container" style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Dashboard</h1>

      {error && <div className="error-message">{error}</div>}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 24,
          alignItems: "start",
          marginBottom: 32,
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 14,
        }}
      >
        <div>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#f3f3f3",
              border: "1px solid #ddd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: "#f5f5f5",
                }}
              />
            ) : (
              <span style={{ color: "#777" }}>No photo</span>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleProfilePhotoChange(e.target.files?.[0] ?? null)}
            />
            {uploadingPhoto && <div style={{ marginTop: 8 }}>Uploading...</div>}
          </div>
        </div>

        <div>
          <h2 style={{ marginTop: 0 }}>Your Profile</h2>

          <div style={{ marginBottom: 8 }}>
            <strong>Display Name:</strong>{" "}
            {editingName ? (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <input
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  style={{ padding: "4px 8px", width: 180 }}
                />
                <button
                  className="btn-accent"
                  style={{ padding: "4px 12px", fontSize: 13 }}
                  onClick={async () => {
                    if (!displayNameInput.trim()) return;
                    try {
                      await apiFetch("/Profile/display-name", {
                        method: "PUT",
                        body: JSON.stringify({ displayName: displayNameInput.trim() }),
                      });
                      setMe((prev) => prev ? { ...prev, displayName: displayNameInput.trim() } : prev);
                      setEditingName(false);
                    } catch {
                      // error
                    }
                  }}
                >
                  Save
                </button>
                <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 13 }} onClick={() => setEditingName(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <span>
                {me?.displayName ?? me?.email?.split("@")[0] ?? "—"}
                <button
                  className="btn-ghost"
                  style={{ padding: "2px 8px", fontSize: 12, marginLeft: 8 }}
                  onClick={() => {
                    setDisplayNameInput(me?.displayName ?? "");
                    setEditingName(true);
                  }}
                >
                  Edit
                </button>
              </span>
            )}
          </div>

          <p>
            <strong>Email:</strong> {me?.email}
          </p>
          <p>
            <strong>Role:</strong> {me?.role}
          </p>
          <p>
            <strong>Joined:</strong>{" "}
            {me ? new Date(me.createdAtUtc).toLocaleString() : "—"}
          </p>

          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/business/new">Create a business</Link>
            <Link href="/dashboard/ads">Manage Ads</Link>
            <Link href="/dashboard/favorites">Saved Businesses</Link>
            <Link href="/dashboard/feed">Activity Feed</Link>
            {me?.role === "admin" && (
              <>
                <Link href="/admin/stats">Site Analytics</Link>
                <Link href="/admin/import">Data Import</Link>
                <Link href="/admin/ads">Review Ads</Link>
                <Link href="/admin/claims">Review Claims</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Your Businesses</h2>

        {businesses.length === 0 ? (
          <p>You do not own or manage any businesses yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {businesses.map((business) => (
              <div
                key={business.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <Link
                  href={`/dashboard/business/${business.slug}`}
                  style={{ textDecoration: "none", color: "#111" }}
                >
                  <strong>{business.name}</strong>
                </Link>

                <div style={{ marginTop: 6 }}>
                  {[business.city, business.state].filter(Boolean).join(", ")}
                </div>

                <div style={{ marginTop: 6, color: "#666" }}>
                  Role: {business.membershipRole}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Business Categories You’ve Reviewed</h2>

          {reviewedCategoryCounts.length === 0 ? (
            <p>No review activity yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {reviewedCategoryCounts.map((item) => (
                <div
                  key={item.categoryName}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eee",
                    paddingBottom: 8,
                  }}
                >
                  <span>{item.categoryName}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Positive Categories You’ve Selected</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Service</span>
              <strong>{positiveTagTotals.service}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Quality</span>
              <strong>{positiveTagTotals.quality}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Cleanliness</span>
              <strong>{positiveTagTotals.cleanliness}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Value</span>
              <strong>{positiveTagTotals.value}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Experience</span>
              <strong>{positiveTagTotals.experience}</strong>
            </div>
          </div>
        </div>
      </section>

      {badges.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2>Your Badges</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {badges.map((badge) => (
              <div
                key={badge.badgeKey}
                style={{
                  border: "1px solid #e0d4f7",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: "#f5f0ff",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 700, color: "#6b21a8" }}>{badge.badgeLabel}</div>
                <div style={{ fontSize: 11, color: "#9b7fd4", marginTop: 4 }}>
                  {new Date(badge.awardedAtUtc).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>Recent Review Activity</h2>

        {recentReviews.length === 0 ? (
          <p>No reviews posted yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {recentReviews.map((review) => (
              <div
                key={review.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <Link
                    href={`/business/${review.businessSlug}`}
                    style={{ textDecoration: "none", color: "#111" }}
                  >
                    <strong>{review.businessName}</strong>
                  </Link>
                </div>

                <span className="tag-accent" style={{ fontSize: 12, marginBottom: 6, display: "inline-block" }}>review</span>

                {review.title && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>{review.title}</strong>
                  </div>
                )}

                {review.body && (
                  <div style={{ color: "#555", marginBottom: 8 }}>{review.body}</div>
                )}

                <small>{new Date(review.createdAtUtc).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        Logout
      </button>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
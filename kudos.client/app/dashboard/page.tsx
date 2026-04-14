"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe, logout } from "@/lib/auth";
import { getDashboardActivity, getProfilePhoto, uploadProfilePhoto } from "@/lib/dashboard";
import { useRouter } from "next/navigation";

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

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
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

  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setError("");

    try {
      const [meData, businessesRes, photoData, activityData] = await Promise.all([
        getMe(),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profile/business`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          cache: "no-store",
        }).then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        }),
        getProfilePhoto(),
        getDashboardActivity(),
      ]);

      setMe(meData);
      setBusinesses(businessesRes ?? []);
      setProfilePhotoUrl(photoData?.originalUrl ?? null);
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
    loadDashboard();
  }, []);

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
    return <main style={{ padding: 24 }}>Loading dashboard...</main>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Dashboard</h1>

      {error && <pre style={{ color: "red" }}>{error}</pre>}

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
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
          <p><strong>Email:</strong> {me?.email}</p>
          <p><strong>Role:</strong> {me?.role}</p>
          <p><strong>Joined:</strong> {me ? new Date(me.createdAtUtc).toLocaleString() : "—"}</p>

          <div style={{ marginTop: 16 }}>
            <Link href="/business/new">Create a business</Link>
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

                <div style={{ marginBottom: 6 }}>
                  Rating: {review.rating}/5
                </div>

                {review.title && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>{review.title}</strong>
                  </div>
                )}

                {review.body && (
                  <div style={{ color: "#555", marginBottom: 8 }}>
                    {review.body}
                  </div>
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
"use client";

import { useEffect, useState } from "react";
import { getTaterLevel } from "@/lib/taterLevel";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BusinessReview,
  getBusinessReviews,
  getPublicBusiness,
  getPublicBusinessPhotos,
  PublicBusiness,
  PublicBusinessPhoto,
} from "@/lib/publicBusiness";
import { getStaffMembers, StaffMember } from "@/lib/staff";
import { getPlaceholderImage } from "@/lib/placeholderImages";
import ReviewForm from "@/components/ReviewForm";

export default function WriteReviewForBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [primaryPhoto, setPrimaryPhoto] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOwnReview, setHasOwnReview] = useState(false);

  async function loadReviews(businessId: string) {
    try {
      const data = await getBusinessReviews(businessId);
      setReviews(data.reviews);
      setHasOwnReview(data.reviews.some((r) => r.isOwnReview));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const biz = await getPublicBusiness(slug);
        setBusiness(biz);

        const [staffData, photos] = await Promise.all([
          getStaffMembers(biz.id).catch(() => [] as StaffMember[]),
          getPublicBusinessPhotos(biz.id).catch(() => [] as PublicBusinessPhoto[]),
          loadReviews(biz.id),
        ]);
        setStaff(staffData);
        const primary = photos.find((p) => p.isPrimary) ?? photos[0];
        setPrimaryPhoto(primary?.originalUrl ?? null);
      } catch {
        // business not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </main>
    );
  }

  if (!business) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <h2>Business not found</h2>
        <Link href="/write-review" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
          Search for another business
        </Link>
      </main>
    );
  }

  const photoUrl = primaryPhoto || getPlaceholderImage([]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <Link
        href="/write-review"
        style={{ fontSize: 14, color: "var(--color-text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Choose a different business
      </Link>

      <div style={{
        display: "flex", gap: 16, alignItems: "center",
        padding: 20, borderRadius: 12,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        marginBottom: 32,
      }}>
        <img
          src={photoUrl}
          alt={business.name}
          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
        />
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{business.name}</h2>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            {[business.city, business.state].filter(Boolean).join(", ")}
          </div>
        </div>
      </div>

      <div className="wr-layout">
        <div className="wr-left">
          {hasOwnReview ? (
            <div className="section-card" style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
              <h3 style={{ marginBottom: 8 }}>You already reviewed this business</h3>
              <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>
                You can edit your review on the business page.
              </p>
              <Link
                href={`/business/${slug}`}
                className="btn-accent"
                style={{ display: "inline-block", padding: "10px 24px" }}
              >
                View Business Page
              </Link>
            </div>
          ) : (
            <div className="section-card" style={{ padding: 24 }}>
              <ReviewForm
                businessId={business.id}
                staffMembers={staff}
                onReviewCreated={async () => {
                  await loadReviews(business.id);
                  router.push(`/business/${slug}`);
                }}
              />
            </div>
          )}
        </div>

        <div className="wr-right">
          <h3 style={{ marginBottom: 16, fontSize: 18 }}>Recent Reviews</h3>
          {reviews.length === 0 ? (
            <div className="section-card" style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)" }}>
              No reviews yet — be the first!
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {reviews.slice(0, 8).map((review) => (
                <div key={review.id} className="section-card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{review.displayName}</span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 10, padding: "1px 6px", borderRadius: 999,
                      background: "var(--color-accent-light)", color: "var(--color-accent)",
                      fontWeight: 600,
                    }}>
                      <img src={getTaterLevel(review.userReviewCount).image} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                      {getTaterLevel(review.userReviewCount).name}
                    </span>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                      {new Date(review.createdAtUtc).toLocaleDateString()}
                    </span>
                  </div>

                  {review.positiveTags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {review.positiveTags.map((tag) => (
                        <span key={tag} className="tag" style={{ fontSize: 11, padding: "2px 8px" }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {review.staffRecognitions && review.staffRecognitions.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      {review.staffRecognitions.map((sr) => (
                        <div
                          key={sr.staffMemberId}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "3px 8px", borderRadius: 999,
                            border: "1px solid var(--color-border)",
                            fontSize: 11,
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%", background: "#f0f0f0",
                            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            {sr.photoUrl ? (
                              <img src={sr.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: 8, color: "#999" }}>{sr.firstName[0]}{sr.lastName[0]}</span>
                            )}
                          </div>
                          <span style={{ fontWeight: 600 }}>{sr.firstName}</span>
                          {sr.tags.length > 0 && (
                            <span style={{ color: "var(--color-text-muted)" }}>
                              {sr.tags.map((t) => {
                                const icons: Record<string, string> = {
                                  friendly: "😊", knowledgeable: "🧠", efficient: "⚡",
                                  professional: "👔", "went-above-and-beyond": "🌟",
                                };
                                return icons[t] || t;
                              }).join(" ")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {review.photos.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      {review.photos.slice(0, 3).map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.originalUrl}
                          alt="Review photo"
                          style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6 }}
                        />
                      ))}
                    </div>
                  )}

                  {review.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{review.title}</div>}
                  {review.body && (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                      {review.body.length > 150 ? review.body.slice(0, 150) + "..." : review.body}
                    </p>
                  )}
                </div>
              ))}

              {reviews.length > 8 && (
                <Link
                  href={`/business/${slug}`}
                  style={{ textAlign: "center", fontWeight: 600, fontSize: 13, color: "var(--color-accent)" }}
                >
                  View all {reviews.length} reviews
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .wr-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .wr-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

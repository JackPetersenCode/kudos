"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getTaterLevel } from "@/lib/taterLevel";
import {
  BusinessHour,
  BusinessReview,
  BusinessReviewsResponse,
  deleteBusinessReview,
  flagBusinessReview,
  getBusinessHours,
  getBusinessReviews,
  getPublicBusiness,
  getPublicBusinessPhotos,
  PublicBusiness,
  PublicBusinessPhoto,
} from "@/lib/publicBusiness";
import ReviewForm from "@/components/ReviewForm";
import BusinessLocationMap from "@/components/BusinessLocationMap";
import AppImage from "@/components/AppImage";
import BusinessPhotoShowcase from "@/components/BusinessPhotoShowcase";
import StaffSection from "@/components/StaffSection";
import ShareButtons from "@/components/ShareButtons";
import SponsoredBanner from "@/components/SponsoredBanner";
import { uploadCommunityPhoto, deleteCommunityPhoto } from "@/lib/photos";
import { getMe } from "@/lib/auth";
import { getStaffMembers, StaffMember } from "@/lib/staff";
import {
  getFavoriteStatus,
  addFavorite,
  removeFavorite,
  markReviewHelpful,
  unmarkReviewHelpful,
  createReviewResponse,
  checkIn,
  getCheckInCount,
  getSeasonalTags,
  SeasonalTag,
} from "@/lib/features";
import ClaimBusinessFlow from "@/components/ClaimBusinessFlow";
import { useToast } from "@/components/Toast";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const CATEGORY_META = [
  { key: "service", label: "Service", icon: "🤝" },
  { key: "quality", label: "Quality", icon: "⭐" },
  { key: "cleanliness", label: "Cleanliness", icon: "🧼" },
  { key: "value", label: "Value", icon: "💰" },
  { key: "experience", label: "Experience", icon: "✨" },
] as const;

export default function PublicBusinessPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [photos, setPhotos] = useState<PublicBusinessPhoto[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);

  const [categoryClicks, setCategoryClicks] = useState({
    service: 0,
    quality: 0,
    cleanliness: 0,
    value: 0,
    experience: 0,
  });
  const [editingReview, setEditingReview] = useState<BusinessReview | null>(null);
  const [flaggingReviewId, setFlaggingReviewId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagDetails, setFlagDetails] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [staffForReview, setStaffForReview] = useState<StaffMember[]>([]);
  const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [checkInCount, setCheckInCount] = useState(0);
  const [seasonalTags, setSeasonalTags] = useState<SeasonalTag[]>([]);
  const [respondingToReviewId, setRespondingToReviewId] = useState<string | null>(null);
  const [responseBody, setResponseBody] = useState("");
  const [respondingLoading, setRespondingLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReviews(businessId: string) {
    const reviewData: BusinessReviewsResponse = await getBusinessReviews(businessId);
    setReviews(reviewData.reviews);
    setReviewCount(reviewData.reviewCount);
    setCategoryClicks(reviewData.categoryClicks);
  }

  async function handleDeleteReview(reviewId: string) {
    if (!business) return;

    try {
      await deleteBusinessReview(business.id, reviewId);
      await loadReviews(business.id);
      setEditingReview(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete review", "error");
    }
  }

  async function handleToggleFavorite() {
    if (!business) return;
    try {
      if (isFavorited) {
        await removeFavorite(business.id);
        setIsFavorited(false);
      } else {
        await addFavorite(business.id);
        setIsFavorited(true);
      }
    } catch {
      // ignore if not logged in
    }
  }

  async function handleCheckIn() {
    if (!business) return;
    try {
      await checkIn(business.id);
      const counts = await getCheckInCount(business.id);
      setCheckInCount(counts.totalCheckIns);
    } catch {
      // ignore
    }
  }

  async function handleToggleHelpful(review: BusinessReview) {
    if (!business) return;
    try {
      if (review.isMarkedHelpful) {
        await unmarkReviewHelpful(review.id);
      } else {
        await markReviewHelpful(review.id);
      }
      await loadReviews(business.id);
    } catch {
      // ignore
    }
  }

  async function handleSubmitResponse(reviewId: string) {
    if (!business || !responseBody.trim()) return;
    setRespondingLoading(true);
    try {
      await createReviewResponse(business.id, reviewId, responseBody.trim());
      setRespondingToReviewId(null);
      setResponseBody("");
      await loadReviews(business.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not submit response", "error");
    } finally {
      setRespondingLoading(false);
    }
  }


  useEffect(() => {
    async function loadPage() {
      try {
        const businessData = await getPublicBusiness(slug);
        setBusiness(businessData);

        const [photoData, hourData, seasonalData, checkinData, staffData] = await Promise.all([
          getPublicBusinessPhotos(businessData.id),
          getBusinessHours(businessData.id),
          getSeasonalTags(businessData.id).catch(() => []),
          getCheckInCount(businessData.id).catch(() => ({ totalCheckIns: 0, uniqueUsers: 0 })),
          getStaffMembers(businessData.id).catch(() => [] as StaffMember[]),
        ]);

        setPhotos(photoData);
        setHours(hourData);
        setSeasonalTags(seasonalData);
        setCheckInCount(checkinData.totalCheckIns);
        setStaffForReview(staffData);
        await loadReviews(businessData.id);

        // Load current user ID (may fail if not logged in)
        try {
          const me = await getMe();
          setCurrentUserId(me.userId);
        } catch {
          // not logged in
        }

        // Load favorite status (may fail if not logged in)
        try {
          const favStatus = await getFavoriteStatus(businessData.id);
          setIsFavorited(favStatus.isFavorited);
        } catch {
          // not logged in
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load business page");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadPage();
    }
  }, [slug]);

  if (loading) {
    return (
      <main className="page-container">
        <div style={{ display: "grid", gap: 16, paddingTop: 32 }}>
          <div className="skeleton" style={{ height: 40, width: 300 }} />
          <div className="skeleton" style={{ height: 20, width: 200 }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <div className="error-message">{error}</div>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="page-container">
        <div className="empty-state">
          <h3>Business not found</h3>
          <p>This business may have been removed or the URL is incorrect.</p>
        </div>
      </main>
    );
  }

  const ownReview = reviews.find((r) => r.isOwnReview) ?? null;

  const latitude =
    business.latitude !== null && business.latitude !== undefined
      ? Number(business.latitude)
      : null;

  const longitude =
    business.longitude !== null && business.longitude !== undefined
      ? Number(business.longitude)
      : null;

  const hasValidCoordinates =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const featureItems = [
    business.acceptsReservations ? "Reservations" : null,
    business.offersOnlineWaitlist ? "Offers Online Waitlist" : null,
    business.offersDelivery ? "Offers Delivery" : null,
    business.offersTakeout ? "Offers Takeout" : null,
    business.outdoorSeating ? "Outdoor Seating" : null,
  ].filter(Boolean) as string[];

  return (
    <main className="page-container" style={{ maxWidth: 1100 }}>
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1 }}>
            {business.name}
          </h1>

          {reviewCount > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-full)", background: "var(--color-accent-light)", fontWeight: 700, fontSize: 15, color: "var(--color-accent)" }}>
              {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            color: "#444",
          }}
        >
          <span className={business.isOpenNow ? "tag-success" : "tag"}>
            {business.isOpenNow ? "Open Now" : "Closed"}
          </span>

          <span className="tag">
            {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </span>

          {business.priceLevel && (
            <span className="tag" style={{ letterSpacing: "0.06em" }}>
              {"$".repeat(business.priceLevel)}
            </span>
          )}

          {checkInCount > 0 && (
            <span className="tag">
              {checkInCount} check-in{checkInCount === 1 ? "" : "s"}
            </span>
          )}

          {isAuthenticated && (
            <>
              <button
                onClick={handleToggleFavorite}
                className={isFavorited ? "toggle-btn active" : "toggle-btn"}
                style={{ padding: "7px 16px" }}
              >
                {isFavorited ? "♥ Saved" : "♡ Save"}
              </button>

              <button onClick={handleCheckIn} className="toggle-btn" style={{ padding: "7px 16px" }}>
                Check In
              </button>
            </>
          )}

          <ClaimBusinessFlow businessId={business.id} onClaimed={() => {}} />
        </div>
      </section>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>
          What people highlight
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {CATEGORY_META.map((category) => {
            const count = categoryClicks[category.key];
            return (
              <div
                key={category.key}
                className="toggle-btn"
                style={{
                  cursor: "default",
                  background: count > 0 ? "var(--color-accent-light)" : undefined,
                  borderColor: count > 0 ? "transparent" : undefined,
                  color: count > 0 ? "var(--color-accent)" : undefined,
                }}
              >
                <span style={{ marginRight: 6 }}>{category.icon}</span>
                {category.label}
                <span style={{ marginLeft: 6, fontWeight: 800 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {seasonalTags.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Happening Now</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {seasonalTags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  border: "1px solid #e0d4f7",
                  borderRadius: 999,
                  padding: "8px 14px",
                  background: "#f5f0ff",
                  fontWeight: 600,
                  color: "#6b21a8",
                }}
              >
                {tag.tagName}
                {tag.expiresAtUtc && (
                  <span style={{ fontSize: 11, marginLeft: 6, color: "#9b7fd4" }}>
                    until {new Date(tag.expiresAtUtc).toLocaleDateString()}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <ShareButtons url={`/business/${slug}`} title={business.name} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label className="btn-outline" style={{
            cursor: stagedPhotos.length >= 5 ? "not-allowed" : "pointer",
            opacity: stagedPhotos.length >= 5 ? 0.5 : 1,
            display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Add Photos {stagedPhotos.length > 0 && `(${stagedPhotos.length}/5)`}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={stagedPhotos.length >= 5}
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                setStagedPhotos((prev) => {
                  const combined = [...prev, ...files];
                  if (combined.length > 5) {
                    showToast("You can upload at most 5 photos at a time.", "error");
                    return combined.slice(0, 5);
                  }
                  return combined;
                });
                e.target.value = "";
              }}
            />
          </label>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Help others by sharing a photo of this business
          </span>
        </div>

        {stagedPhotos.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {stagedPhotos.map((file, i) => (
                <div key={`${file.name}-${i}`} style={{ position: "relative" }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{
                      width: 100, height: 100, objectFit: "cover",
                      borderRadius: 8, border: "1px solid var(--color-border)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setStagedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{
                      position: "absolute", top: -6, right: -6,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--color-primary)", color: "white",
                      border: "2px solid var(--color-surface)",
                      cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, lineHeight: 1, padding: 0,
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                className="btn-accent"
                disabled={uploadingPhotos}
                onClick={async () => {
                  if (!business) return;
                  setUploadingPhotos(true);
                  try {
                    for (const file of stagedPhotos) {
                      await uploadCommunityPhoto(business.id, file);
                    }
                    const updatedPhotos = await getPublicBusinessPhotos(business.id);
                    setPhotos(updatedPhotos);
                    setStagedPhotos([]);
                    showToast(`${stagedPhotos.length} photo${stagedPhotos.length > 1 ? "s" : ""} uploaded!`, "success");
                  } catch {
                    showToast("Could not upload photos. Make sure you are logged in.", "error");
                  } finally {
                    setUploadingPhotos(false);
                  }
                }}
                style={{ padding: "8px 20px", fontSize: 13 }}
              >
                {uploadingPhotos ? "Uploading..." : `Upload ${stagedPhotos.length} Photo${stagedPhotos.length > 1 ? "s" : ""}`}
              </button>
              <button
                className="btn-ghost"
                onClick={() => setStagedPhotos([])}
                disabled={uploadingPhotos}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <BusinessPhotoShowcase
        photos={photos}
        businessName={business.name}
        currentUserId={currentUserId}
        onDeletePhoto={async (photoId) => {
          try {
            await deleteCommunityPhoto(business.id, photoId);
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            showToast("Photo deleted", "success");
          } catch {
            showToast("Could not delete photo", "error");
          }
        }}
      />

      <SponsoredBanner placementSlug="search-sponsored" category="" city={business.city ?? ""} state={business.state ?? ""} />

      <section className="top-info-grid" style={{ marginBottom: 28 }}>
        <div className="section-card">
          <h2>About</h2>
          <p style={{ marginBottom: 0, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
            {business.description ?? "No description provided."}
          </p>
        </div>

        <div className="section-card">
          <h2>Features</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {featureItems.length > 0 ? (
              featureItems.map((feature) => (
                <span key={feature} className="tag-success">{feature}</span>
              ))
            ) : (
              <span style={{ color: "var(--color-text-muted)" }}>No features listed.</span>
            )}
          </div>
        </div>
      </section>

      <section className="mid-info-grid" style={{ marginBottom: 28 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="section-card">
            <h2>Contact</h2>
            <div style={{ display: "grid", gap: 8, color: "var(--color-text-secondary)" }}>
              <div>
                <strong style={{ color: "var(--color-text)" }}>Phone:</strong> {business.phone ?? "Not provided"}
              </div>
              <div>
                <strong style={{ color: "var(--color-text)" }}>Website:</strong>{" "}
                {business.websiteUrl ? (
                  <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer">{business.websiteUrl}</a>
                ) : "Not provided"}
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Location</h2>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {business.address1 && <div>{business.address1}</div>}
              {business.address2 && <div>{business.address2}</div>}
              <div>
                {[business.city, business.state, business.postalCode]
                  .filter(Boolean)
                  .join(", ") || "No address provided"}
              </div>
            </div>
          </div>

          <div className="section-card">
            <h2>Hours</h2>
            <div style={{ display: "grid", gap: 6 }}>
              {hours.map((hour) => (
                <div key={hour.dayOfWeek} style={{ display: "flex", gap: 12, fontSize: 14 }}>
                  <strong style={{ width: 110 }}>{DAY_NAMES[hour.dayOfWeek]}</strong>
                  <span style={{ color: hour.isClosed ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>
                    {hour.isClosed ? "Closed" : `${hour.openTime} – ${hour.closeTime}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {hasValidCoordinates && (
          <div className="section-card">
            <h2>Map</h2>
            <BusinessLocationMap
              name={business.name}
              latitude={latitude}
              longitude={longitude}
            />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, textDecoration: "none", padding: "10px 20px" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Get Directions
            </a>
          </div>
        )}
      </section>

      <StaffSection businessId={business.id} />

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24 }}>Reviews</h2>

        {reviews.length === 0 ? (
          <div className="empty-state">
            <h3>No reviews yet</h3>
            <p>Be the first to share your experience!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {reviews.map((review) => (
              <div key={review.id} className="section-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <a href={`/profile/${review.userId}`} style={{ fontWeight: 600, fontSize: 14, textDecoration: "none", color: "var(--color-text)" }}>{review.displayName}</a>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, padding: "2px 8px", borderRadius: 999,
                    background: "var(--color-accent-light)", color: "var(--color-accent)",
                    fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                    <img src={getTaterLevel(review.userReviewCount).image} alt="" width={16} height={16} style={{ objectFit: "contain" }} />
                    {getTaterLevel(review.userReviewCount).name}
                  </span>
                </div>

                {review.positiveTags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {review.positiveTags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}

                {review.staffRecognitions && review.staffRecognitions.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    {review.staffRecognitions.map((sr) => (
                      <div
                        key={sr.staffMemberId}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 12px", borderRadius: 999,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface)",
                          fontSize: 13,
                        }}
                      >
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%", background: "#f0f0f0",
                          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {sr.photoUrl ? (
                            <img src={sr.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: 10, color: "#999" }}>{sr.firstName[0]}{sr.lastName[0]}</span>
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
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    {review.photos.map((photo) => (
                      <AppImage
                        key={photo.id}
                        src={photo.originalUrl}
                        alt="Review photo"
                        height={220}
                        borderRadius={10}
                        border="1px solid #ddd"
                      />
                    ))}
                  </div>
                )}

                {review.title && <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>{review.title}</h3>}
                <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "4px 0 8px" }}>{review.body ?? ""}</p>
                <small style={{ color: "var(--color-text-muted)" }}>{new Date(review.createdAtUtc).toLocaleString()}</small>

                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => handleToggleHelpful(review)}
                    className={review.isMarkedHelpful ? "toggle-btn active" : "toggle-btn"}
                    style={{ padding: "5px 14px", fontSize: 13 }}
                  >
                    {review.isMarkedHelpful ? "♥" : "♡"} Helpful ({review.helpfulCount})
                  </button>

                  {review.isOwnReview ? (
                    <>
                      <button onClick={() => setEditingReview(review)} className="btn-ghost">Edit</button>
                      <button onClick={() => handleDeleteReview(review.id)} className="btn-danger" style={{ padding: "5px 14px", fontSize: 13 }}>Delete</button>
                    </>
                  ) : !review.businessResponse && isAuthenticated && currentUserId ? (
                    <>
                      <button
                        onClick={() => { setRespondingToReviewId(review.id); setResponseBody(""); }}
                        className="btn-ghost"
                        style={{ padding: "5px 14px", fontSize: 13 }}
                      >
                        Respond
                      </button>
                    </>
                  ) : null}

                  {!review.isOwnReview && (
                    <button
                      onClick={() => {
                        setFlaggingReviewId(review.id);
                        setFlagReason("");
                        setFlagDetails("");
                      }}
                      className="btn-ghost"
                      style={{ padding: "5px 14px", fontSize: 13, color: "var(--color-text-muted)" }}
                      title="Report this review"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4, verticalAlign: -1 }}>
                        <path d="M14.4 6l-.3-1.5A1 1 0 0013.1 4H6v16h2v-6h4.6l.3 1.5a1 1 0 001 .5H20V6h-5.6z" />
                      </svg>
                      Report
                    </button>
                  )}
                </div>

                {review.businessResponse && (
                  <div style={{ marginTop: 14, padding: 16, background: "var(--color-bg)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--color-accent)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: "var(--color-accent)" }}>
                      Business Response
                    </div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{review.businessResponse.body}</p>
                    <small style={{ color: "var(--color-text-muted)" }}>
                      {new Date(review.businessResponse.createdAtUtc).toLocaleString()}
                    </small>
                  </div>
                )}

                {!review.businessResponse && respondingToReviewId === review.id && (
                  <div style={{ marginTop: 12 }}>
                    <textarea
                      placeholder="Write your response..."
                      value={responseBody}
                      onChange={(e) => setResponseBody(e.target.value)}
                      style={{ display: "block", width: "100%", minHeight: 60, padding: 8, marginBottom: 8, boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleSubmitResponse(review.id)}
                        disabled={respondingLoading}
                      >
                        {respondingLoading ? "Sending..." : "Submit Response"}
                      </button>
                      <button onClick={() => setRespondingToReviewId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="section-card" style={{ marginTop: 24, textAlign: "center", padding: 24 }}>
            <p style={{ margin: "0 0 12px", color: "var(--color-text-secondary)" }}>
              Want to share your experience?
            </p>
            <a href="/login" className="btn-accent" style={{ textDecoration: "none", padding: "10px 24px", display: "inline-block" }}>
              Log in to leave a review
            </a>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              Don&apos;t have an account? <a href="/register">Sign up</a>
            </p>
          </div>
        ) : editingReview ? (
          <ReviewForm
            businessId={business.id}
            staffMembers={staffForReview}
            existingReview={{
              id: editingReview.id,
              rating: editingReview.rating,
              title: editingReview.title,
              body: editingReview.body,
              photos: editingReview.photos,
              positiveTags: editingReview.positiveTags,
              staffRecognitions: editingReview.staffRecognitions?.map((sr) => ({
                staffMemberId: sr.staffMemberId,
                tags: sr.tags,
              })),
            }}
            onReviewCreated={async () => {
              setEditingReview(null);
              await loadReviews(business.id);
            }}
            onCancelEdit={() => setEditingReview(null)}
          />
        ) : ownReview ? null : (
          <ReviewForm
            businessId={business.id}
            staffMembers={staffForReview}
            onReviewCreated={() => loadReviews(business.id)}
          />
        )}
      </section>

      {/* Flag Review Modal */}
      {flaggingReviewId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setFlaggingReviewId(null)}
        >
          <div
            style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, maxWidth: 440, width: "100%", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Report Review</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              Select a reason for reporting this review. Our team will review it and take action if it violates our guidelines.
            </p>

            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {[
                { value: "spam", label: "Spam or fake review" },
                { value: "inappropriate", label: "Inappropriate or offensive content" },
                { value: "conflict-of-interest", label: "Conflict of interest (e.g. competitor)" },
                { value: "wrong-business", label: "Review is for the wrong business" },
                { value: "other", label: "Other" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                    border: flagReason === opt.value ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: flagReason === opt.value ? "var(--color-accent-light)" : "transparent",
                    fontSize: 14, transition: "all 0.1s",
                  }}
                >
                  <input
                    type="radio"
                    name="flag-reason"
                    value={opt.value}
                    checked={flagReason === opt.value}
                    onChange={() => setFlagReason(opt.value)}
                    style={{ width: "auto", margin: 0 }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <textarea
              placeholder="Additional details (optional)"
              value={flagDetails}
              onChange={(e) => setFlagDetails(e.target.value)}
              style={{ width: "100%", minHeight: 70, marginBottom: 16, padding: 10, boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn-ghost"
                onClick={() => setFlaggingReviewId(null)}
                disabled={flagSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={!flagReason || flagSubmitting}
                onClick={async () => {
                  if (!business || !flaggingReviewId || !flagReason) return;
                  setFlagSubmitting(true);
                  try {
                    await flagBusinessReview(business.id, flaggingReviewId, flagReason, flagDetails || undefined);
                    showToast("Review reported. Our team will review it.", "success");
                    setFlaggingReviewId(null);
                  } catch {
                    showToast("Could not report review. You may have already reported it.", "error");
                  } finally {
                    setFlagSubmitting(false);
                  }
                }}
                style={{ padding: "8px 20px" }}
              >
                {flagSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .top-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .mid-info-grid {
          display: grid;
          grid-template-columns: ${hasValidCoordinates ? "1fr 1fr" : "1fr"};
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 800px) {
          .top-info-grid,
          .mid-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
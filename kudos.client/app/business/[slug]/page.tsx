"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BusinessHour,
  BusinessReview,
  BusinessReviewsResponse,
  deleteBusinessReview,
  getBusinessHours,
  getBusinessReviews,
  getPublicBusiness,
  getPublicBusinessPhotos,
  PublicBusiness,
  PublicBusinessPhoto,
} from "@/lib/publicBusiness";
import ReviewForm from "@/components/ReviewForm";
import BusinessLocationMap from "@/components/BusinessLocationMap";

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

  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [photos, setPhotos] = useState<PublicBusinessPhoto[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [categoryClicks, setCategoryClicks] = useState({
    service: 0,
    quality: 0,
    cleanliness: 0,
    value: 0,
    experience: 0,
  });
  const [editingReview, setEditingReview] = useState<BusinessReview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReviews(businessId: string) {
    const reviewData: BusinessReviewsResponse = await getBusinessReviews(businessId);
    setReviews(reviewData.reviews);
    setReviewCount(reviewData.reviewCount);
    setAverageRating(Number(reviewData.averageRating));
    setCategoryClicks(reviewData.categoryClicks);
  }

  async function handleDeleteReview(reviewId: string) {
    if (!business) return;

    try {
      await deleteBusinessReview(business.id, reviewId);
      await loadReviews(business.id);
      setEditingReview(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete review");
    }
  }

  useEffect(() => {
    async function loadPage() {
      try {
        const businessData = await getPublicBusiness(slug);
        setBusiness(businessData);

        const [photoData, hourData] = await Promise.all([
          getPublicBusinessPhotos(businessData.id),
          getBusinessHours(businessData.id),
        ]);

        setPhotos(photoData);
        setHours(hourData);
        await loadReviews(businessData.id);
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
    return <main style={{ padding: 24 }}>Loading...</main>;
  }

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Business</h1>
        <pre style={{ color: "red" }}>{error}</pre>
      </main>
    );
  }

  if (!business) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Business not found</h1>
      </main>
    );
  }

  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;
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

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>{business.name}</h1>

      <div style={{ marginTop: 8, marginBottom: 20, color: "#444" }}>
        <strong>{averageRating.toFixed(1)}</strong> / 5
        {" • "}
        {reviewCount} review{reviewCount === 1 ? "" : "s"}
        {" • "}
        {business.isOpenNow ? "Open Now" : "Closed"}
        {business.priceLevel ? ` • ${"$".repeat(business.priceLevel)}` : ""}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>
          What people say this business does well
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {CATEGORY_META.map((category) => (
            <div
              key={category.key}
              style={{
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "10px 14px",
                background: "#fff",
              }}
            >
              <span style={{ marginRight: 8 }}>{category.icon}</span>
              {category.label}
              <span style={{ marginLeft: 8, fontWeight: 700 }}>
                {categoryClicks[category.key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {primaryPhoto && (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <img
            src={primaryPhoto.originalUrl}
            alt={business.name}
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: 12,
            }}
          />
        </div>
      )}

      {photos.length > 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.originalUrl}
              alt={business.name}
              style={{
                width: "100%",
                height: 160,
                objectFit: "cover",
                borderRadius: 10,
              }}
            />
          ))}
        </div>
      )}

      {hasValidCoordinates && (
        <section style={{ marginBottom: 32 }}>
          <h2>Map</h2>
          <BusinessLocationMap
            name={business.name}
            latitude={latitude}
            longitude={longitude}
          />
        </section>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>About</h2>
        <p>{business.description ?? "No description provided."}</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Contact</h2>
        <p><strong>Phone:</strong> {business.phone ?? "Not provided"}</p>
        <p><strong>Website:</strong> {business.websiteUrl ?? "Not provided"}</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Hours</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {hours.map((hour) => (
            <div key={hour.dayOfWeek} style={{ display: "flex", gap: 12 }}>
              <strong style={{ width: 120 }}>{DAY_NAMES[hour.dayOfWeek]}</strong>
              <span>
                {hour.isClosed ? "Closed" : `${hour.openTime} - ${hour.closeTime}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Features</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {business.acceptsReservations && <span>Reservations</span>}
          {business.offersOnlineWaitlist && <span>Offers Online Waitlist</span>}
          {business.offersDelivery && <span>Offers Delivery</span>}
          {business.offersTakeout && <span>Offers Takeout</span>}
          {business.outdoorSeating && <span>Outdoor Seating</span>}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Location</h2>
        <p>{business.address1 ?? ""}</p>
        {business.address2 && <p>{business.address2}</p>}
        <p>
          {[business.city, business.state, business.postalCode].filter(Boolean).join(", ") || "No address provided"}
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Reviews</h2>

        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <strong>{review.rating}/5</strong> by {review.userEmail}
                </div>

                {review.positiveTags.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {review.positiveTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 12,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {review.title && <h3 style={{ marginTop: 0 }}>{review.title}</h3>}
                <p>{review.body ?? ""}</p>
                <small>{new Date(review.createdAtUtc).toLocaleString()}</small>

                {review.isOwnReview && (
                  <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                    <button onClick={() => setEditingReview(review)}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteReview(review.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {editingReview ? (
          <ReviewForm
            businessId={business.id}
            existingReview={{
              id: editingReview.id,
              rating: editingReview.rating,
              title: editingReview.title,
              body: editingReview.body,
            }}
            onReviewCreated={() => loadReviews(business.id)}
            onCancelEdit={() => setEditingReview(null)}
          />
        ) : ownReview ? null : (
          <ReviewForm
            businessId={business.id}
            onReviewCreated={() => loadReviews(business.id)}
          />
        )}
      </section>
    </main>
  );
}
"use client";

import { useState } from "react";
import {
  createBusinessReview,
  updateBusinessReview,
} from "@/lib/publicBusiness";

type ReviewFormProps = {
  businessId: string;
  onReviewCreated: () => Promise<void> | void;
  existingReview?: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
  } | null;
  onCancelEdit?: () => void;
};

export default function ReviewForm({
  businessId,
  onReviewCreated,
  existingReview = null,
  onCancelEdit,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [title, setTitle] = useState(existingReview?.title ?? "");
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditMode = !!existingReview;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isEditMode && existingReview) {
        await updateBusinessReview(businessId, existingReview.id, {
          rating,
          title: title || null,
          body: body || null,
        });
        setSuccess("Review updated.");
      } else {
        await createBusinessReview(businessId, {
          rating,
          title: title || null,
          body: body || null,
        });
        setSuccess("Review posted.");
        setTitle("");
        setBody("");
        setRating(5);
      }

      await onReviewCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <h3>{isEditMode ? "Edit Your Review" : "Leave a Review"}</h3>

      <div style={{ marginBottom: 12 }}>
        <label>
          Rating:
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          >
            <option value={5}>5</option>
            <option value={4}>4</option>
            <option value={3}>3</option>
            <option value={2}>2</option>
            <option value={1}>1</option>
          </select>
        </label>
      </div>

      <input
        placeholder="Review title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
      />

      <textarea
        placeholder="Write your review"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ display: "block", width: "100%", minHeight: 120, marginBottom: 12, padding: 8 }}
      />

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEditMode ? "Save Changes" : "Post Review"}
        </button>

        {isEditMode && onCancelEdit && (
          <button type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </div>

      {error && <pre style={{ color: "red", marginTop: 12 }}>{error}</pre>}
      {success && <pre style={{ color: "green", marginTop: 12 }}>{success}</pre>}
    </form>
  );
}
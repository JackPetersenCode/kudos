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

const POSITIVE_CATEGORIES = [
  { key: "service", label: "Service", icon: "🤝" },
  { key: "quality", label: "Quality", icon: "⭐" },
  { key: "cleanliness", label: "Cleanliness", icon: "🧼" },
  { key: "value", label: "Value", icon: "💰" },
  { key: "experience", label: "Experience", icon: "✨" },
] as const;

export default function ReviewForm({
  businessId,
  onReviewCreated,
  existingReview = null,
  onCancelEdit,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [title, setTitle] = useState(existingReview?.title ?? "");
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditMode = !!existingReview;

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((x) => x !== tag)
        : [...prev, tag]
    );
  }

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
        await onReviewCreated();
        return;
      }

      try {
        await createBusinessReview(businessId, {
          rating,
          title: title || null,
          body: body || null,
          positiveTags: selectedTags,
        });
      } catch (err) {
        const error = err as Error & { reason?: string };

        if (error.reason === "negative_sentiment") {
          window.alert(
            `Mama always says, "If you don't have anything nice to say, don't say anything at all!"`
          );
          return;
        }

        throw err;
      }

      setSuccess("Review posted.");
      setTitle("");
      setBody("");
      setRating(5);
      setSelectedTags([]);

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

      {!isEditMode && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            What did this business do well?
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {POSITIVE_CATEGORIES.map((category) => {
              const isSelected = selectedTags.includes(category.key);

              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => toggleTag(category.key)}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: isSelected ? "#111" : "#fff",
                    color: isSelected ? "#fff" : "#111",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ marginRight: 6 }}>{category.icon}</span>
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
"use client";

import { useEffect, useRef, useState } from "react";
import {
  createBusinessReview,
  updateBusinessReview,
} from "@/lib/publicBusiness";
import { uploadReviewPhoto } from "@/lib/reviewPhotos";
import { StaffMember } from "@/lib/staff";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import SignInPromptModal from "@/components/SignInPromptModal";

type ReviewFormProps = {
  businessId: string;
  onReviewCreated: () => Promise<void> | void;
  staffMembers?: StaffMember[];
  existingReview?: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    photos?: {
      id: string;
      originalUrl: string;
      createdAtUtc: string;
    }[];
    positiveTags?: string[];
    staffRecognitions?: {
      staffMemberId: string;
      tags: string[];
    }[];
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

const STAFF_TAGS = [
  { key: "friendly", label: "Friendly", icon: "😊" },
  { key: "knowledgeable", label: "Knowledgeable", icon: "🧠" },
  { key: "efficient", label: "Efficient", icon: "⚡" },
  { key: "professional", label: "Professional", icon: "👔" },
  { key: "went-above-and-beyond", label: "Above & Beyond", icon: "🌟" },
] as const;

export default function ReviewForm({
  businessId,
  onReviewCreated,
  staffMembers = [],
  existingReview = null,
  onCancelEdit,
}: ReviewFormProps) {
  const [title, setTitle] = useState(existingReview?.title ?? "");
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    existingReview?.positiveTags ?? []
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState(
    existingReview?.photos ?? []
  );
  const [deletePhotoIds, setDeletePhotoIds] = useState<string[]>([]);
  const { showToast } = useToast();
  const { isAuthenticated, isReady } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sign-in modal state: when a signed-out user hits Post Review,
  // we open this modal instead of redirecting. After sign-in, the
  // pendingSubmit ref is replayed automatically.
  const [signInOpen, setSignInOpen] = useState(false);
  const pendingSubmit = useRef(false);

  // Staff recognition state — initialize from existing review if editing
  const [staffRecognitions, setStaffRecognitions] = useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    if (existingReview?.staffRecognitions) {
      for (const sr of existingReview.staffRecognitions) {
        initial[sr.staffMemberId] = sr.tags ?? [];
      }
    }
    return initial;
  });

  const isEditMode = !!existingReview;

  useEffect(() => {
    setTitle(existingReview?.title ?? "");
    setBody(existingReview?.body ?? "");
    setExistingPhotos(existingReview?.photos ?? []);
    setSelectedTags(existingReview?.positiveTags ?? []);
    setDeletePhotoIds([]);
    setSelectedFiles([]);
    const sr: Record<string, string[]> = {};
    if (existingReview?.staffRecognitions) {
      for (const r of existingReview.staffRecognitions) {
        sr[r.staffMemberId] = r.tags ?? [];
      }
    }
    setStaffRecognitions(sr);
  }, [existingReview]);

  // Replay the pending submit after the user signs in via the modal
  useEffect(() => {
    if (isAuthenticated && pendingSubmit.current) {
      pendingSubmit.current = false;
      setSignInOpen(false);
      submitReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((x) => x !== tag)
        : [...prev, tag]
    );
  }

  const maxNewPhotos = 5 - existingPhotos.length;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    setSelectedFiles((prev) => {
      const combined = [...prev, ...incoming];
      if (combined.length > maxNewPhotos) {
        showToast(`You can add at most ${maxNewPhotos} new photo${maxNewPhotos === 1 ? "" : "s"}.`, "error");
        return combined.slice(0, maxNewPhotos);
      }
      return combined;
    });
  }

  function toggleStaffTag(staffId: string, tag: string) {
    setStaffRecognitions((prev) => {
      const current = prev[staffId] ?? [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      if (updated.length === 0) {
        const { [staffId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [staffId]: updated };
    });
  }

  function markPhotoForDeletion(photoId: string) {
    setDeletePhotoIds((prev) =>
      prev.includes(photoId) ? prev : [...prev, photoId]
    );

    setExistingPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitReview();
  }

  async function submitReview() {
    setError("");
    setSuccess("");

    if (selectedTags.length === 0) {
      setError("Please select at least one category.");
      return;
    }

    // If signed out, show the sign-in modal and stash a flag to replay
    // this submit after sign-in. Preserves the user's typed content.
    if (isReady && !isAuthenticated) {
      pendingSubmit.current = true;
      setSignInOpen(true);
      return;
    }

    setLoading(true);

    // Auto-calculate rating from number of tags selected
    const autoRating = Math.max(1, selectedTags.length) as 1 | 2 | 3 | 4 | 5;

    try {
      let uploadedPhotos: {
        storageKey: string;
        originalUrl: string;
        contentType?: string | null;
        sizeBytes?: number | null;
      }[] = [];

      if (selectedFiles.length > 0) {
        uploadedPhotos = await Promise.all(
          selectedFiles.map((file) => uploadReviewPhoto(file))
        );
      }

      const staffRecognitionPayload = Object.entries(staffRecognitions).map(
        ([staffMemberId, tags]) => ({ staffMemberId, tags })
      );

      if (isEditMode && existingReview) {
        await updateBusinessReview(businessId, existingReview.id, {
          rating: autoRating,
          title: title || null,
          body: body || null,
          positiveTags: selectedTags,
          photos: uploadedPhotos,
          deletePhotoIds,
          staffRecognitions: staffRecognitionPayload,
        });

        setSuccess("Review updated.");
        setSelectedFiles([]);
        setDeletePhotoIds([]);
        await onReviewCreated();
        return;
      }

      try {
        await createBusinessReview(businessId, {
          rating: autoRating,
          title: title || null,
          body: body || null,
          positiveTags: selectedTags,
          photos: uploadedPhotos,
          staffRecognitions: staffRecognitionPayload,
        });
      } catch (err) {
        const errorWithReason = err as Error & { reason?: string };

        if (errorWithReason.reason === "negative_sentiment") {
          showToast(
            `Mama always says, "If you don't have anything nice to say, don't say anything at all!"`,
            "error"
          );
          return;
        }

        throw err;
      }

      setSuccess("Review posted.");
      setTitle("");
      setBody("");
      setSelectedTags([]);
      setSelectedFiles([]);
      setStaffRecognitions({});

      await onReviewCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: isEditMode ? 24 : 0 }}>
      {isEditMode && <h3>Edit Your Review</h3>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>
          What did this business do well? <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(select at least one)</span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
          {POSITIVE_CATEGORIES.map((category) => {
            const isSelected = selectedTags.includes(category.key);

            return (
              <button
                key={category.key}
                type="button"
                onClick={() => toggleTag(category.key)}
                className={isSelected ? "toggle-btn active" : "toggle-btn"}
                style={{
                  padding: "8px 10px",
                  fontSize: 13,
                  flex: "1 1 0",
                  minWidth: 0,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ marginRight: 4 }}>{category.icon}</span>
                {category.label}
              </button>
            );
          })}
        </div>
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

      {isEditMode && existingPhotos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            Existing Photos
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {existingPhotos.map((photo) => (
              <div key={photo.id} style={{ position: "relative" }}>
                <img
                  src={photo.originalUrl}
                  alt="Review photo"
                  style={{
                    width: 100, height: 100, objectFit: "cover",
                    borderRadius: 8, border: "1px solid var(--color-border)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => markPhotoForDeletion(photo.id)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#dc2626", color: "white",
                    border: "2px solid var(--color-surface)",
                    cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, lineHeight: 1, padding: 0,
                  }}
                  title="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <label className="btn-outline" style={{
            cursor: selectedFiles.length >= maxNewPhotos ? "not-allowed" : "pointer",
            opacity: selectedFiles.length >= maxNewPhotos ? 0.5 : 1,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", fontSize: 13,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {isEditMode ? "Add New Photos" : "Add Photos"}
            {selectedFiles.length > 0 && ` (${selectedFiles.length}/${maxNewPhotos})`}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={selectedFiles.length >= maxNewPhotos}
              style={{ display: "none" }}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Up to {maxNewPhotos} photo{maxNewPhotos === 1 ? "" : "s"}
          </span>
        </div>

        {selectedFiles.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
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
                  onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
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
        )}
      </div>

      {staffMembers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            Recognize a team member <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {staffMembers.map((member) => {
              const isSelected = !!staffRecognitions[member.id];
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      const { [member.id]: _, ...rest } = staffRecognitions;
                      setStaffRecognitions(rest);
                    } else {
                      setStaffRecognitions((prev) => ({ ...prev, [member.id]: [] }));
                    }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 14px", borderRadius: 999,
                    border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: isSelected ? "rgba(240,165,0,0.08)" : "var(--color-surface)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "#f0f0f0",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 12, color: "#999" }}>{member.firstName[0]}{member.lastName[0]}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{member.firstName}</span>
                  {isSelected && <span style={{ color: "var(--color-accent)", fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {Object.keys(staffRecognitions).length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {Object.entries(staffRecognitions).map(([staffId, tags]) => {
                const member = staffMembers.find((m) => m.id === staffId);
                if (!member) return null;
                return (
                  <div key={staffId} style={{
                    padding: 12, borderRadius: 8, border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      What did {member.firstName} do well?
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {STAFF_TAGS.map((tag) => {
                        const active = tags.includes(tag.key);
                        return (
                          <button
                            key={tag.key}
                            type="button"
                            onClick={() => toggleStaffTag(staffId, tag.key)}
                            className={active ? "toggle-btn active" : "toggle-btn"}
                            style={{ padding: "6px 12px", fontSize: 12 }}
                          >
                            <span style={{ marginRight: 4 }}>{tag.icon}</span>
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <SignInPromptModal
        open={signInOpen}
        onClose={() => {
          setSignInOpen(false);
          pendingSubmit.current = false;
        }}
        onSignedIn={() => {
          // useEffect on isAuthenticated will fire and replay submitReview()
        }}
        title="Sign in to post your review"
        subtitle="Your review is saved — we'll post it as soon as you're signed in."
      />
    </form>
  );
}
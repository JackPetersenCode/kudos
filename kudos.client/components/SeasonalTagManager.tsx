"use client";

import { useEffect, useState } from "react";
import {
  SeasonalTag,
  getSeasonalTags,
  createSeasonalTag,
  deleteSeasonalTag,
} from "@/lib/features";
import { useToast } from "@/components/Toast";

type Props = {
  businessId: string;
};

export default function SeasonalTagManager({ businessId }: Props) {
  const { showToast } = useToast();
  const [tags, setTags] = useState<SeasonalTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tagName, setTagName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadTags() {
    try {
      const data = await getSeasonalTags(businessId);
      setTags(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTags();
  }, [businessId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tagName.trim()) return;

    setSaving(true);
    setError("");

    try {
      await createSeasonalTag(businessId, {
        tagName: tagName.trim(),
        expiresAtUtc: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setTagName("");
      setExpiresAt("");
      setShowForm(false);
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tag");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tagId: string) {
    try {
      await deleteSeasonalTag(businessId, tagId);
      await loadTags();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete tag", "error");
    }
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #ccc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Seasonal & Event Tags</h2>
        <button onClick={() => setShowForm(!showForm)}>Add Tag</button>
      </div>

      <p style={{ color: "#666", marginBottom: 16 }}>
        Add temporary tags to let customers know about specials, events, or seasonal offerings.
      </p>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <input
            placeholder='Tag name (e.g., "Live Music Tonight", "Holiday Hours")'
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12, padding: 8, boxSizing: "border-box" }}
          />

          <div style={{ marginBottom: 12 }}>
            <label>
              Expires at (optional):
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{ marginLeft: 8, padding: 8 }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Tag"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>

          {error && <pre style={{ color: "red", marginTop: 8 }}>{error}</pre>}
        </form>
      )}

      {tags.length === 0 ? (
        <p>No active tags.</p>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{tag.tagName}</span>
              {tag.expiresAtUtc && (
                <span style={{ fontSize: 11, color: "#888" }}>
                  until {new Date(tag.expiresAtUtc).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={() => handleDelete(tag.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#999",
                  fontSize: 14,
                }}
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

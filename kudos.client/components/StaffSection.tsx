"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  StaffMember,
  StaffKudos,
  getStaffMembers,
  getStaffKudos,
  createStaffKudos,
} from "@/lib/staff";
import { TagIcon } from "@/lib/icons";

const STAFF_TAGS = [
  { key: "friendly", label: "Friendly" },
  { key: "knowledgeable", label: "Knowledgeable" },
  { key: "efficient", label: "Efficient" },
  { key: "professional", label: "Professional" },
  { key: "went-above-and-beyond", label: "Above & Beyond" },
] as const;

type Props = {
  businessId: string;
};

export default function StaffSection({ businessId }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [kudosList, setKudosList] = useState<StaffKudos[]>([]);
  const [loading, setLoading] = useState(true);

  // Kudos form state
  const [kudosBody, setKudosBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [kudosError, setKudosError] = useState("");
  const [kudosSuccess, setKudosSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getStaffMembers(businessId);
        setStaff(data);
      } catch {
        // no staff
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId]);

  async function openStaffDetail(member: StaffMember) {
    setSelectedStaff(member);
    setKudosBody("");
    setSelectedTags([]);
    setKudosError("");
    setKudosSuccess("");
    try {
      const data = await getStaffKudos(businessId, member.id);
      setKudosList(data);
    } catch {
      setKudosList([]);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmitKudos(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStaff) return;

    setSubmitting(true);
    setKudosError("");
    setKudosSuccess("");

    try {
      await createStaffKudos(businessId, selectedStaff.id, {
        body: kudosBody || null,
        tags: selectedTags,
      });
      setKudosSuccess("Review sent!");
      setKudosBody("");
      setSelectedTags([]);

      const [updatedStaff, updatedKudos] = await Promise.all([
        getStaffMembers(businessId),
        getStaffKudos(businessId, selectedStaff.id),
      ]);
      setStaff(updatedStaff);
      setKudosList(updatedKudos);
      const updated = updatedStaff.find((s) => s.id === selectedStaff.id);
      if (updated) setSelectedStaff(updated);
    } catch (err) {
      setKudosError(err instanceof Error ? err.message : "Could not send kudos");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (staff.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2>Meet the Team</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {staff.map((member) => (
          <div
            key={member.id}
            onClick={() => openStaffDetail(member)}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
              background: selectedStaff?.id === member.id ? "#f7f7f7" : "#fff",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#f0f0f0",
                margin: "0 auto 12px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={`${member.firstName} ${member.lastName}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 28, color: "#999" }}>
                  {member.firstName[0]}
                  {member.lastName[0]}
                </span>
              )}
            </div>

            <div style={{ fontWeight: 700 }}>
              {member.firstName} {member.lastName}
            </div>

            {member.role && (
              <div style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
                {member.role}
              </div>
            )}

            <div style={{ marginTop: 8, fontWeight: 600 }}>
              {member.kudosCount} reviews
            </div>

            {member.topTags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                {member.topTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.tagName}
                    style={{
                      fontSize: 11,
                      border: "1px solid #ddd",
                      borderRadius: 999,
                      padding: "3px 8px",
                      background: "#f9f9f9",
                    }}
                  >
                    {tag.tagName} ({tag.count})
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedStaff && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: 0 }}>
              Leave a review for {selectedStaff.firstName} {selectedStaff.lastName}
            </h3>
            <button
              onClick={() => setSelectedStaff(null)}
              aria-label="Close"
              style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", color: "var(--color-text-secondary)" }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmitKudos}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>
                What did they do well?
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {STAFF_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.key);
                  return (
                    <button
                      key={tag.key}
                      type="button"
                      onClick={() => toggleTag(tag.key)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                        borderRadius: 999,
                        padding: "9px 14px",
                        fontWeight: 600,
                        fontSize: 14,
                        background: isSelected ? "var(--color-accent-light)" : "var(--color-surface)",
                        color: isSelected ? "var(--color-accent-hover)" : "var(--color-text)",
                        cursor: "pointer",
                        transition: "all var(--transition)",
                      }}
                    >
                      <TagIcon tagKey={tag.key} size={15} />
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              placeholder="Say something nice (optional)"
              value={kudosBody}
              onChange={(e) => setKudosBody(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                minHeight: 80,
                marginBottom: 12,
                padding: 8,
                boxSizing: "border-box",
              }}
            />

            <button type="submit" disabled={submitting || selectedTags.length === 0}>
              {submitting ? "Sending..." : "Send Review"}
            </button>

            {kudosError && <pre style={{ color: "red", marginTop: 8 }}>{kudosError}</pre>}
            {kudosSuccess && <pre style={{ color: "green", marginTop: 8 }}>{kudosSuccess}</pre>}
          </form>

          {kudosList.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4>Recent Reviews</h4>
              <div style={{ display: "grid", gap: 12 }}>
                {kudosList.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    {k.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {k.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: 12,
                              border: "1px solid #ddd",
                              borderRadius: 999,
                              padding: "3px 8px",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {k.body && <p style={{ margin: "4px 0" }}>{k.body}</p>}
                    <small style={{ color: "#888" }}>
                      {k.userEmail} - {new Date(k.createdAtUtc).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

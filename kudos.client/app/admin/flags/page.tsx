"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";

type Flag = {
  id: string;
  reviewId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAtUtc: string;
  resolutionNote: string | null;
  flaggerEmail: string;
  reviewTitle: string | null;
  reviewBody: string | null;
  reviewerEmail: string;
  businessName: string;
  businessSlug: string;
  totalFlags: number;
};

function FlagsContent() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "dismissed" | "removed">("pending");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/flags?status=${tab}`);
      setFlags(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tab]);

  async function handleResolve(flagId: string, action: "dismiss" | "remove") {
    setResolvingId(flagId);
    try {
      await apiFetch(`/admin/flags/${flagId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action, note: resolveNote || null }),
      });
      showToast(action === "remove" ? "Review removed." : "Flag dismissed.", "success");
      setResolveNote("");
      await load();
    } catch {
      showToast("Failed to resolve flag.", "error");
    } finally {
      setResolvingId(null);
    }
  }

  const REASON_LABELS: Record<string, string> = {
    spam: "Spam / Fake",
    inappropriate: "Inappropriate",
    "conflict-of-interest": "Conflict of Interest",
    "wrong-business": "Wrong Business",
    other: "Other",
  };

  return (
    <main className="page-container" style={{ maxWidth: 900 }}>
      <h1 style={{ marginBottom: 8 }}>Flagged Reviews</h1>
      <p style={{ color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24 }}>
        Reviews reported by the community for violating guidelines.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["pending", "dismissed", "removed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "toggle-btn active" : "toggle-btn"}
            style={{ padding: "7px 16px", fontSize: 13, textTransform: "capitalize" }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ minHeight: "50vh" }} />
      ) : flags.length === 0 ? (
        <div className="empty-state">
          <h3>No {tab} flags</h3>
          <p>{tab === "pending" ? "All clear! No reviews need attention." : `No ${tab} flags to show.`}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {flags.map((flag) => (
            <div key={flag.id} className="section-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      className={flag.reason === "spam" || flag.reason === "inappropriate" ? "tag-accent" : "tag"}
                      style={{ fontSize: 11, padding: "2px 8px" }}
                    >
                      {REASON_LABELS[flag.reason] ?? flag.reason}
                    </span>
                    {flag.totalFlags > 1 && (
                      <span className="tag" style={{ fontSize: 11, padding: "2px 8px", background: "var(--color-danger-light)", color: "var(--color-danger)" }}>
                        {flag.totalFlags} reports
                      </span>
                    )}
                  </div>
                  <Link href={`/business/${flag.businessSlug}`} style={{ fontSize: 14, fontWeight: 600 }}>
                    {flag.businessName}
                  </Link>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {new Date(flag.createdAtUtc).toLocaleDateString()}
                </span>
              </div>

              <div style={{ padding: 14, background: "var(--color-bg)", borderRadius: 8, marginBottom: 12, border: "1px solid var(--color-border-light)" }}>
                {flag.reviewTitle && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{flag.reviewTitle}</div>}
                <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {flag.reviewBody || "No review text."}
                </p>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                  By: {flag.reviewerEmail}
                </div>
              </div>

              {flag.details && (
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
                  <strong>Reporter notes:</strong> {flag.details}
                </div>
              )}

              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
                Reported by: {flag.flaggerEmail}
              </div>

              {flag.status === "pending" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    placeholder="Resolution note (optional)"
                    value={resolvingId === flag.id ? resolveNote : ""}
                    onChange={(e) => { setResolvingId(flag.id); setResolveNote(e.target.value); }}
                    onFocus={() => setResolvingId(flag.id)}
                    style={{ flex: 1, minWidth: 180, padding: 8, fontSize: 13 }}
                  />
                  <button
                    className="btn-danger"
                    style={{ padding: "7px 16px", fontSize: 13 }}
                    disabled={resolvingId === flag.id && !resolveNote && false}
                    onClick={() => handleResolve(flag.id, "remove")}
                  >
                    Remove Review
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: "7px 16px", fontSize: 13 }}
                    onClick={() => handleResolve(flag.id, "dismiss")}
                  >
                    Dismiss Flag
                  </button>
                </div>
              )}

              {flag.resolutionNote && (
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 8 }}>
                  <strong>Resolution:</strong> {flag.resolutionNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function FlagsPage() {
  return (
    <RequireAuth>
      <FlagsContent />
    </RequireAuth>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminClaims, approveClaim, rejectClaim } from "@/lib/features";
import RequireAuth from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";

type Claim = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  userId: string;
  userEmail: string;
  status: string;
  verificationNote: string | null;
  createdAtUtc: string;
};

function ClaimsContent() {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClaims() {
    try {
      const data = await getAdminClaims();
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load claims");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  async function handleApprove(claimId: string) {
    try {
      await approveClaim(claimId);
      await loadClaims();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  async function handleReject(claimId: string) {
    try {
      await rejectClaim(claimId);
      await loadClaims();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Loading claims...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>

      <h1>Business Claims</h1>

      {error && <pre style={{ color: "red" }}>{error}</pre>}

      {claims.length === 0 ? (
        <p>No claims to review.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {claims.map((claim) => (
            <div
              key={claim.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    <Link href={`/business/${claim.businessSlug}`}>{claim.businessName}</Link>
                  </div>
                  <div style={{ color: "#666", marginTop: 4 }}>Claimed by: {claim.userEmail}</div>
                  {claim.verificationNote && (
                    <div style={{ marginTop: 8, color: "#555" }}>
                      <strong>Note:</strong> {claim.verificationNote}
                    </div>
                  )}
                  <div style={{ marginTop: 4, fontSize: 13, color: "#888" }}>
                    {new Date(claim.createdAtUtc).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {claim.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApprove(claim.id)}
                        style={{ padding: "8px 16px", background: "#1e7a36", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(claim.id)}
                        style={{ padding: "8px 16px", background: "#d32f2f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: claim.status === "approved" ? "#edf8ef" : "#ffeef0",
                        color: claim.status === "approved" ? "#1e7a36" : "#d32f2f",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {claim.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ClaimsPage() {
  return (
    <RequireAuth>
      <ClaimsContent />
    </RequireAuth>
  );
}

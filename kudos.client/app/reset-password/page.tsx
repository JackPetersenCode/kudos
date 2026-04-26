"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReputaterLogo from "@/components/ReputaterLogo";
import { apiFetch } from "@/lib/api";

function ResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch("/Auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="page-container-narrow" style={{ paddingTop: 60, textAlign: "center" }}>
        <div className="error-message">Missing reset token.</div>
        <Link href="/forgot-password" style={{ fontWeight: 600 }}>Request a new reset link</Link>
      </main>
    );
  }

  return (
    <main className="page-container-narrow" style={{ paddingTop: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <ReputaterLogo size={36} />
        </Link>
      </div>

      <div className="section-card" style={{ padding: 32 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, textAlign: "center" }}>Set New Password</h1>

        {success ? (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div className="success-message">Password reset successfully!</div>
            <Link href="/login" className="btn-accent" style={{ textDecoration: "none", display: "inline-block", marginTop: 16 }}>
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
            <div>
              <label htmlFor="reset-password">New Password</label>
              <input id="reset-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>

            <div>
              <label htmlFor="reset-confirm">Confirm Password</label>
              <input id="reset-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm your password" />
            </div>

            <button type="submit" disabled={loading} className="btn-accent" style={{ width: "100%", padding: "12px 18px" }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {error && <div className="error-message">{error}</div>}
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="page-container-narrow" style={{ paddingTop: 60 }}>Loading...</main>}>
      <ResetContent />
    </Suspense>
  );
}

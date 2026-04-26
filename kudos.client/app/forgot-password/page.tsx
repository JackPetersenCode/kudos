"use client";

import { useState } from "react";
import Link from "next/link";
import ReputaterLogo from "@/components/ReputaterLogo";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      await apiFetch("/Auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-container-narrow" style={{ paddingTop: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <ReputaterLogo size={36} />
        </Link>
      </div>

      <div className="section-card" style={{ padding: 32 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, textAlign: "center" }}>Reset Password</h1>

        {sent ? (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div className="success-message">
              If that email exists, a reset link has been sent. Check your inbox.
            </div>
            <Link href="/login" style={{ fontWeight: 600, display: "inline-block", marginTop: 16 }}>
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
              <div>
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-accent" style={{ width: "100%", padding: "12px 18px" }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              {error && <div className="error-message">{error}</div>}
            </form>

            <p style={{ textAlign: "center", marginTop: 16 }}>
              <Link href="/login" style={{ fontWeight: 600 }}>Back to login</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

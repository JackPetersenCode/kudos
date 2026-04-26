"use client";

import Link from "next/link";
import { useState } from "react";
import ReputaterLogo from "@/components/ReputaterLogo";

type AuthFormProps = {
  title: string;
  buttonText: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  altText?: string;
  altLink?: string;
  altLinkText?: string;
  showTerms?: boolean;
};

export default function AuthForm({
  title,
  buttonText,
  onSubmit,
  altText,
  altLink,
  altLinkText,
  showTerms = false,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (showTerms && !acceptedTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-container-narrow" style={{ paddingTop: 60 }}>
      <div
        style={{
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <ReputaterLogo size={36} />
        </Link>
      </div>

      <div className="section-card" style={{ padding: 32 }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: 28, textAlign: "center" }}>{title}</h1>

        {altText && altLink && altLinkText && (
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginTop: 4 }}>
            {altText}{" "}
            <Link href={altLink} style={{ fontWeight: 600 }}>
              {altLinkText}
            </Link>
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
          <div>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <div style={{ textAlign: "right" }}>
            <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Forgot password?
            </Link>
          </div>

          {showTerms && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: 3, width: "auto" }}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" style={{ fontWeight: 600 }}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" target="_blank" style={{ fontWeight: 600 }}>Privacy Policy</Link>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent"
            style={{ width: "100%", padding: "12px 18px", fontSize: 15 }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="spinner" />
                Signing in...
              </span>
            ) : (
              buttonText
            )}
          </button>

          {error && <div className="error-message">{error}</div>}
        </form>
      </div>

      <style jsx>{`
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

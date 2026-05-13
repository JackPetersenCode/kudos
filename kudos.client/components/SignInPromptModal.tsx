"use client";

import { useState } from "react";
import { login, register } from "@/lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
  title?: string;
  subtitle?: string;
};

/**
 * Modal that prompts a signed-out user to sign in or create an account
 * inline, without losing their place on the current page. Used by
 * actions like "Post Review" where redirecting away would lose the
 * user's typed content.
 */
export default function SignInPromptModal({
  open,
  onClose,
  onSignedIn,
  title = "Sign in to continue",
  subtitle = "You'll need an account to post.",
}: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      onSignedIn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: 14,
          padding: 28,
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h2>
            <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontSize: 14 }}>{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={mode === "signin" ? "toggle-btn active" : "toggle-btn"}
            style={{ flex: 1, padding: "10px 16px", fontSize: 14 }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "toggle-btn active" : "toggle-btn"}
            style={{ flex: 1, padding: "10px 16px", fontSize: 14 }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            autoComplete="email"
            required
            style={{ width: "100%", padding: 10, marginBottom: 14, borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14 }}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            style={{ width: "100%", padding: 10, marginBottom: 14, borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14 }}
          />

          {error && (
            <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent"
            style={{ width: "100%", padding: "12px 16px", fontSize: 15, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Working..." : mode === "signin" ? "Sign in & post" : "Create account & post"}
          </button>

          {mode === "signin" && (
            <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--color-text-muted)" }}>
              <a href="/forgot-password" style={{ color: "var(--color-accent)" }}>Forgot password?</a>
            </p>
          )}

          {mode === "signup" && (
            <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              By creating an account you agree to our{" "}
              <a href="/terms" target="_blank" style={{ color: "var(--color-accent)" }}>Terms</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" style={{ color: "var(--color-accent)" }}>Privacy Policy</a>.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

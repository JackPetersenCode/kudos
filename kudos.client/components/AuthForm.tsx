// src/components/AuthForm.tsx
"use client";

import { useState } from "react";

type AuthFormProps = {
  title: string;
  buttonText: string;
  onSubmit: (email: string, password: string) => Promise<void>;
};

export default function AuthForm({
  title,
  buttonText,
  onSubmit,
}: AuthFormProps) {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
    <main style={{ padding: 24, maxWidth: 400 }}>
      <h1>{title}</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          style={{ display: "block", width: "100%", marginBottom: 8, padding: 8 }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          style={{ display: "block", width: "100%", marginBottom: 8, padding: 8 }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : buttonText}
        </button>
      </form>

      {error && <pre style={{ color: "red", marginTop: 12 }}>{error}</pre>}
    </main>
  );
}
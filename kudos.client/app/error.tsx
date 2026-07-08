"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the console for diagnostics; nothing is shown to the user.
    console.error(error);
  }, [error]);

  return (
    <main
      className="page-container-narrow"
      style={{
        textAlign: "center",
        paddingTop: 80,
        paddingBottom: 80,
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 8 }}>😕</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: "var(--color-text)",
          margin: "0 0 12px 0",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          margin: "0 0 28px 0",
        }}
      >
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Back home
        </Link>
      </div>
    </main>
  );
}

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fafbfc", fontFamily: "Inter, system-ui, sans-serif", color: "#1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h2>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: "#f0a500",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

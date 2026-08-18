import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="page-container-narrow"
      style={{
        textAlign: "center",
        paddingTop: 80,
        paddingBottom: 80,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <span style={{ display: "grid", placeItems: "center", width: 72, height: 72, borderRadius: "50%", background: "var(--color-accent-light)", color: "var(--color-accent-hover)" }}>
          <Compass size={36} strokeWidth={1.75} />
        </span>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-accent)",
          marginBottom: 12,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: "var(--color-text)",
          margin: "0 0 12px 0",
        }}
      >
        We couldn&apos;t find that page
      </h1>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          margin: "0 0 28px 0",
        }}
      >
        The page you&apos;re looking for may have been moved or no longer exists.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link href="/" className="btn btn-primary">
          Back home
        </Link>
        <Link href="/search" className="btn btn-outline">
          Search businesses
        </Link>
      </div>
    </main>
  );
}

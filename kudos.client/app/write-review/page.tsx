"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import RequireAuth from "@/components/RequireAuth";

export default function WriteReviewPage() {
  return (
    <RequireAuth>
      <WriteReviewContent />
    </RequireAuth>
  );
}

function WriteReviewContent() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Write a Review</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: 32, fontSize: 16, lineHeight: 1.6 }}>
        Search for a business to share your experience. Only positive reviews are accepted — tell the world what a business did right!
      </p>

      <div className="write-review-search">
        <SearchAutocomplete
          value={query}
          onChange={setQuery}
          placeholder="Search for a business..."
          onSelect={(slug) => router.push(`/write-review/${slug}`)}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
      </div>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 32, alignItems: "start" }}>
        <div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img src="/logo.png" alt="Reputater" width={64} height={83} />
          </div>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>How it works</h3>
          <div style={{ display: "grid", gap: 20 }}>
            {[
              { step: "1", title: "Find the business", desc: "Type the business name above to search." },
              { step: "2", title: "Share your experience", desc: "Write about what they did well. Recognize great staff." },
              { step: "3", title: "Post your review", desc: "Your review helps great businesses get discovered." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--color-accent)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Become a Tater Rater</h3>
          <p style={{ color: "var(--color-text-secondary)", textAlign: "center", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
            Every review you write earns you progress toward the next level. Your badge appears on every review you post.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { name: "Tater Tot", range: "0–2 reviews", image: "/tater-tot.png" },
              { name: "Small Fry", range: "3–9 reviews", image: "/small-fry.png" },
              { name: "Mashed Master", range: "10–24 reviews", image: "/mashed-master.png" },
              { name: "Tater Titan", range: "25–49 reviews", image: "/tater-titan.png", size: 82, gap: 2 },
              { name: "Loaded Legend", range: "50–99 reviews", image: "/loaded-legend.png", gap: 6, topPad: 8 },
              { name: "Golden Tater", range: "100+ reviews", image: "/golden-tater.png", size: 82, gap: 2 },
            ].map((level) => (
              <div
                key={level.name}
                style={{
                  textAlign: "center", padding: 16, borderRadius: 12,
                  border: "1px solid var(--color-border)", background: "var(--color-surface)",
                }}
              >
                <img src={level.image} alt={level.name} width={(level as any).size || 72} height={(level as any).size || 72} style={{ objectFit: "contain", marginBottom: (level as any).gap ?? 8, marginTop: (level as any).topPad ?? 0 }} />
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{level.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{level.range}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .write-review-search {
          background: var(--color-primary);
          border-radius: var(--radius-full);
          overflow: visible;
          position: relative;
        }
        .write-review-search :global(.ac-search-input) {
          padding: 14px 0 !important;
          font-size: 16px !important;
        }
        .write-review-search :global(.autocomplete-dropdown) {
          border-radius: var(--radius-md);
        }
      `}</style>
    </main>
  );
}

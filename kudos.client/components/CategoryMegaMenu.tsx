"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CATEGORY_TREE } from "@/lib/categoryTree";

const CATEGORY_ICONS: Record<string, string> = {
  "food-drink": "🍽️",
  "shopping": "🛍️",
  "health-beauty": "💆",
  "home-auto": "🏠",
  "professional-services": "💼",
  "entertainment-recreation": "🎭",
};

export default function CategoryMegaMenu() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter(slug: string) {
    if (closeRef.current) { clearTimeout(closeRef.current); closeRef.current = null; }
    setOpenSlug(slug);
  }

  function handleLeave() {
    if (closeRef.current) clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setOpenSlug(null), 120);
  }

  return (
    <>
      {/* Mobile: browse button — hidden on desktop via CSS */}
      <button
        type="button"
        className="cmm-mobile-btn"
        onClick={() => setMobileOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        Browse
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)" }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 500, maxHeight: "calc(100vh - 24px)", marginTop: 8,
              marginLeft: "auto", marginRight: "auto",
              background: "var(--color-surface)", borderRadius: "var(--radius-lg)",
              overflow: "hidden", display: "grid", gridTemplateRows: "auto 1fr",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--color-border)" }}>
              <strong>Categories</strong>
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: 16 }}>
              {CATEGORY_TREE.map((group) => (
                <div key={group.slug} style={{ marginBottom: 20 }}>
                  <Link
                    href={`/search?category=${encodeURIComponent(group.slug)}`}
                    onClick={() => setMobileOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--color-text)", fontWeight: 700, fontSize: 15, marginBottom: 8 }}
                  >
                    <span>{CATEGORY_ICONS[group.slug] ?? "📁"}</span>
                    {group.name}
                  </Link>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {group.children.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/search?category=${encodeURIComponent(sub.slug)}`}
                        onClick={() => setMobileOpen(false)}
                        className="card"
                        style={{ fontSize: 13, padding: "5px 10px", color: "var(--color-text)" }}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: horizontal nav — hidden on mobile via CSS */}
      <nav className="cmm-desktop-nav">
        {CATEGORY_TREE.map((group) => {
          const isOpen = openSlug === group.slug;
          return (
            <div
              key={group.slug}
              style={{ position: "relative" }}
              onMouseEnter={() => handleEnter(group.slug)}
              onMouseLeave={handleLeave}
            >
              <Link
                href={`/search?category=${encodeURIComponent(group.slug)}`}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 10px",
                  textDecoration: "none",
                  color: isOpen ? "white" : "rgba(255,255,255,0.7)",
                  fontWeight: 600, fontSize: 13,
                  borderRadius: "var(--radius-sm)",
                  background: isOpen ? "rgba(255,255,255,0.15)" : "transparent",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 15 }}>{CATEGORY_ICONS[group.slug] ?? "📁"}</span>
                {group.name}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Link>

              {isOpen && (
                <div
                  onMouseEnter={() => handleEnter(group.slug)}
                  onMouseLeave={handleLeave}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    minWidth: 220,
                    maxWidth: 320,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 9999,
                    padding: "8px 0",
                    marginTop: 4,
                  }}
                >
                  <Link
                    href={`/search?category=${encodeURIComponent(group.slug)}`}
                    style={{
                      display: "block", padding: "10px 16px",
                      textDecoration: "none", color: "var(--color-text)",
                      fontWeight: 700, fontSize: 14,
                      borderBottom: "1px solid var(--color-border-light)",
                      marginBottom: 4,
                    }}
                  >
                    All {group.name}
                  </Link>
                  {group.children.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/search?category=${encodeURIComponent(sub.slug)}`}
                      style={{
                        display: "block", padding: "8px 16px",
                        textDecoration: "none", color: "var(--color-text)",
                        fontSize: 14, transition: "all 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-accent-light)";
                        e.currentTarget.style.color = "var(--color-accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--color-text)";
                      }}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

    </>
  );
}

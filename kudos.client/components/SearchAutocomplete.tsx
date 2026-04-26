"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlaceholderImage } from "@/lib/placeholderImages";

type AutocompleteResult = {
  businesses: {
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    photoUrl: string | null;
    reviewCount: number;
    categories: string[];
  }[];
  categories: { name: string; slug: string }[];
  cities: { city: string; state: string | null; count: number }[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  className?: string;
  onSelect?: (slug: string) => void;
};

export default function SearchAutocomplete({ value, onChange, placeholder, icon, className, onSelect }: Props) {
  const router = useRouter();
  const [results, setResults] = useState<AutocompleteResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (value.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/autocomplete?q=${encodeURIComponent(value.trim())}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results && (
    results.businesses.length > 0 ||
    results.categories.length > 0 ||
    results.cities.length > 0
  );

  function handleBusinessClick(slug: string) {
    setOpen(false);
    if (onSelect) {
      onSelect(slug);
    } else {
      router.push(`/business/${slug}`);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }} className={className}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
        <span style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0, display: "flex" }}>{icon}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => hasResults && setOpen(true)}
          placeholder={placeholder}
          className="ac-search-input"
          style={{
            border: "none",
            background: "transparent",
            padding: "10px 0",
            fontSize: 14,
            color: "white",
            width: "100%",
            outline: "none",
          }}
        />
        {loading && (
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, flexShrink: 0 }}>...</span>
        )}
      </div>

      {open && hasResults && (
        <div className="autocomplete-dropdown">
          {results!.businesses.length > 0 && (
            <div className="ac-section">
              <div className="ac-label">Businesses</div>
              {results!.businesses.map((biz) => (
                <button
                  key={biz.slug}
                  className="ac-item ac-item-biz"
                  onClick={() => handleBusinessClick(biz.slug)}
                >
                  <div className="ac-biz-photo">
                    <img
                      src={biz.photoUrl || getPlaceholderImage(biz.categories)}
                      alt=""
                      onError={(e) => { (e.target as HTMLImageElement).src = getPlaceholderImage(biz.categories); }}
                    />
                  </div>
                  <div className="ac-biz-info">
                    <span className="ac-item-name">{biz.name}</span>
                    <span className="ac-biz-meta">
                      {biz.categories.slice(0, 2).join(", ")}
                      {biz.categories.length > 2 && ` +${biz.categories.length - 2}`}
                    </span>
                    <span className="ac-biz-meta">
                      {[biz.city, biz.state].filter(Boolean).join(", ")}
                      {biz.reviewCount > 0 && ` \u00B7 ${biz.reviewCount} review${biz.reviewCount === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results!.categories.length > 0 && (
            <div className="ac-section">
              <div className="ac-label">Categories</div>
              {results!.categories.map((cat) => (
                <button
                  key={cat.slug}
                  className="ac-item"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/search?category=${encodeURIComponent(cat.slug)}`);
                  }}
                >
                  <span className="ac-cat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </span>
                  <span className="ac-item-name">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          {results!.cities.length > 0 && (
            <div className="ac-section">
              <div className="ac-label">Locations</div>
              {results!.cities.map((c) => (
                <button
                  key={`${c.city}-${c.state}`}
                  className="ac-item"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/search?where=${encodeURIComponent(c.city)}`);
                  }}
                >
                  <span className="ac-cat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span className="ac-item-name">{c.city}, {c.state}</span>
                  <span className="ac-item-sub">{c.count} businesses</span>
                </button>
              ))}
            </div>
          )}

          <style jsx>{`
            .autocomplete-dropdown {
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background: var(--color-surface);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-md);
              box-shadow: var(--shadow-lg);
              z-index: 200;
              max-height: 480px;
              overflow-y: auto;
              margin-top: 4px;
            }
            .ac-section {
              padding: 6px 0;
              border-bottom: 1px solid var(--color-border-light);
            }
            .ac-section:last-child {
              border-bottom: none;
            }
            .ac-label {
              padding: 6px 16px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: var(--color-text-muted);
            }
            .ac-item {
              display: flex;
              align-items: center;
              gap: 10px;
              width: 100%;
              padding: 8px 16px;
              border: none;
              background: none;
              cursor: pointer;
              text-align: left;
              font-size: 14px;
              transition: background 0.1s;
            }
            .ac-item:hover {
              background: var(--color-surface-hover);
            }
            .ac-item-biz {
              padding: 10px 16px;
            }
            .ac-biz-photo {
              width: 44px;
              height: 44px;
              border-radius: 8px;
              overflow: hidden;
              flex-shrink: 0;
              background: var(--color-border);
            }
            .ac-biz-photo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            .ac-biz-info {
              display: flex;
              flex-direction: column;
              gap: 1px;
              min-width: 0;
            }
            .ac-biz-meta {
              font-size: 12px;
              color: var(--color-text-muted);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .ac-item-name {
              font-weight: 500;
              color: var(--color-text);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .ac-item-sub {
              font-size: 12px;
              color: var(--color-text-muted);
              margin-left: auto;
              flex-shrink: 0;
            }
            .ac-cat-icon {
              color: var(--color-text-muted);
              display: flex;
              flex-shrink: 0;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

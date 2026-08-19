"use client";

import { useEffect, useRef, useState } from "react";

type CitySuggestion = { city: string; state: string | null; count: number };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onUseCurrentLocation: () => void;
  onSelectCity: (city: string, state: string | null) => void;
  placeholder?: string;
};

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

// Yelp-style location field: dropdown pins "Current Location" on top, then lists
// matching cities as you type. Renders using the shared navbar .search-input-wrap /
// .search-input classes so it drops into the navbar search bar seamlessly.
export default function LocationAutocomplete({
  value,
  onChange,
  onUseCurrentLocation,
  onSelectCity,
  placeholder,
}: Props) {
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 1 || term.toLowerCase() === "current location") {
      setCities([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/autocomplete/cities?q=${encodeURIComponent(term)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setCities(data.cities ?? []);
        }
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="loc-wrap">
      <div className="search-input-wrap">
        <span className="search-icon" style={{ display: "flex" }}>
          <PinIcon />
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "City, state, or zip"}
          className="search-input"
        />
      </div>

      {open && (
        <div className="loc-dropdown">
          <button
            type="button"
            className="loc-item loc-current"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onUseCurrentLocation();
              setOpen(false);
            }}
          >
            <span className="loc-icon loc-accent"><CrosshairIcon /></span>
            <span className="loc-name loc-accent">Current Location</span>
          </button>
          {cities.map((c) => (
            <button
              type="button"
              key={`${c.city}-${c.state ?? ""}`}
              className="loc-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelectCity(c.city, c.state);
                setOpen(false);
              }}
            >
              <span className="loc-icon"><PinIcon /></span>
              <span className="loc-name">
                {c.city}{c.state ? `, ${c.state}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .loc-wrap {
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .loc-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          min-width: 240px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 300;
          margin-top: 8px;
          overflow: hidden;
        }
        .loc-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          color: var(--color-text);
          transition: background 0.1s;
        }
        .loc-item:hover {
          background: var(--color-surface-hover);
        }
        .loc-current {
          border-bottom: 1px solid var(--color-border-light);
        }
        .loc-icon {
          color: var(--color-text-muted);
          display: flex;
          flex-shrink: 0;
        }
        .loc-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .loc-accent {
          color: var(--color-accent);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

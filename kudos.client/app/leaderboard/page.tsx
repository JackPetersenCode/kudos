"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TagIcon } from "@/lib/icons";

type LeaderboardEntry = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  photoUrl: string | null;
  businessName: string;
  businessSlug: string;
  city: string | null;
  state: string | null;
  kudosCount: number;
  topTags: string; // JSON string
};

type TagCount = {
  tagName: string;
  count: number;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<{ city: string; state: string | null; count: number }[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const [stateFilter, setStateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // City autocomplete
  useEffect(() => {
    if (cityInput.trim().length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/autocomplete?q=${encodeURIComponent(cityInput.trim())}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setCitySuggestions(data.cities ?? []);
          setShowCitySuggestions((data.cities ?? []).length > 0);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(cityDebounceRef.current);
  }, [cityInput]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (cityFilter) params.set("city", cityFilter);
        if (stateFilter) params.set("state", stateFilter);
        if (categoryFilter) params.set("category", categoryFilter);
        params.set("limit", "30");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/staff/leaderboard?${params.toString()}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          setEntries(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cityFilter, stateFilter, categoryFilter]);

  function parseTags(json: string): TagCount[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  return (
    <main className="page-container" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Staff Leaderboard</h1>
        <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
          The most recognized employees across local businesses, ranked by total reviews received.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div ref={cityWrapRef} style={{ position: "relative" }}>
          <label style={{ fontSize: 13 }}>City</label>
          <input
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value);
              if (!e.target.value.trim()) {
                setCityFilter("");
              }
            }}
            onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
            placeholder="All cities"
            style={{ width: 200 }}
          />
          {showCitySuggestions && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 8, boxShadow: "var(--shadow-lg)", maxHeight: 240, overflowY: "auto",
              marginTop: 4,
            }}>
              {citySuggestions.map((c) => (
                <button
                  key={`${c.city}-${c.state}`}
                  type="button"
                  onClick={() => {
                    setCityInput(c.city);
                    setCityFilter(c.city);
                    if (c.state) setStateFilter(c.state);
                    setShowCitySuggestions(false);
                  }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "8px 12px", border: "none", background: "none",
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontWeight: 500 }}>{c.city}, {c.state}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{c.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: 13 }}>State</label>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ width: 120 }}
          >
            <option value="">All states</option>
            {[
              "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
              "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
              "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
              "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
              "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
            ].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13 }}>Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="">All Categories</option>
            <optgroup label="Food & Drink">
              <option value="restaurant">Restaurant</option>
              <option value="coffee-shop">Coffee Shop</option>
              <option value="bar">Bar</option>
              <option value="bakery">Bakery</option>
              <option value="pizza">Pizza</option>
            </optgroup>
            <optgroup label="Health & Beauty">
              <option value="salon">Salon</option>
              <option value="barber-shop">Barber Shop</option>
              <option value="spa">Spa</option>
              <option value="gym">Gym</option>
            </optgroup>
            <optgroup label="Shopping">
              <option value="clothing-store">Clothing Store</option>
              <option value="grocery-store">Grocery Store</option>
            </optgroup>
            <optgroup label="Home & Auto">
              <option value="auto-repair">Auto Repair</option>
            </optgroup>
            <optgroup label="Professional Services">
              <option value="law-firm">Law Firm</option>
              <option value="real-estate">Real Estate</option>
            </optgroup>
            <optgroup label="Parent Categories">
              <option value="food-drink">All Food & Drink</option>
              <option value="health-beauty">All Health & Beauty</option>
              <option value="shopping">All Shopping</option>
              <option value="home-auto">All Home & Auto</option>
              <option value="professional-services">All Professional Services</option>
              <option value="entertainment-recreation">All Entertainment</option>
            </optgroup>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="skeleton" style={{ height: 80 }} />
          <div className="skeleton" style={{ height: 80 }} />
          <div className="skeleton" style={{ height: 80 }} />
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <h3>No staff reviews yet</h3>
          <p>Be the first to recognize great employees at local businesses!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {entries.map((entry, index) => {
            const tags = parseTags(entry.topTags);
            const rank = index + 1;

            return (
              <div key={entry.id} className="section-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {/* Rank */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: rank <= 3 ? 18 : 14, flexShrink: 0,
                    background: rank === 1 ? "linear-gradient(135deg, #ffd700, #ffb347)" :
                                rank === 2 ? "linear-gradient(135deg, #c0c0c0, #e0e0e0)" :
                                rank === 3 ? "linear-gradient(135deg, #cd7f32, #daa520)" :
                                "var(--color-surface-hover)",
                    color: rank <= 3 ? "white" : "var(--color-text-secondary)",
                  }}>
                    {rank}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "var(--color-accent-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 800, color: "var(--color-accent)", flexShrink: 0,
                  }}>
                    {entry.photoUrl ? (
                      <img src={entry.photoUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      `${entry.firstName[0]}${entry.lastName[0]}`
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {entry.firstName} {entry.lastName}
                      </span>
                      {entry.role && (
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {entry.role}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/business/${entry.businessSlug}`}
                      style={{ fontSize: 13, display: "block", marginTop: 2 }}
                    >
                      {entry.businessName}
                    </Link>

                    {entry.city && (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {[entry.city, entry.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>

                  {/* Review count */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-accent)" }}>
                      {entry.kudosCount}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>reviews</div>
                  </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginLeft: 104 }}>
                    {tags.map((tag) => (
                      <span key={tag.tagName} className="tag" style={{ fontSize: 11, padding: "2px 8px" }}>
                        <TagIcon tagKey={tag.tagName} size={13} /> {tag.tagName} ({tag.count})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

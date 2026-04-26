"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  searchBusinesses,
  SearchBusinessResult,
  SearchCategoryCount,
  SearchCityCount,
} from "@/lib/search";
import BusinessCard from "@/components/BusinessCard";
import SearchResultsMap from "@/components/SearchResultsMap";
import SponsoredBanner from "@/components/SponsoredBanner";
import { useGeolocation } from "@/hooks/useGeolocation";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export default function SearchPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading search...</main>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const where = searchParams.get("where") ?? "";
  const category = searchParams.get("category") ?? "";
  const city = searchParams.get("city") ?? "";
  const price = searchParams.get("price") ?? "";
  const openNow = searchParams.get("openNow") === "true";
  const reservations = searchParams.get("reservations") === "true";
  const onlineWaitlist = searchParams.get("onlineWaitlist") === "true";
  const delivery = searchParams.get("delivery") === "true";
  const takeout = searchParams.get("takeout") === "true";
  const outdoorSeating = searchParams.get("outdoorSeating") === "true";

  const [results, setResults] = useState<SearchBusinessResult[]>([]);
  const [cityCounts, setCityCounts] = useState<SearchCityCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<SearchCategoryCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedPrice, setSelectedPrice] = useState(price);
  const [filterOpenNow, setFilterOpenNow] = useState(openNow);
  const [filterReservations, setFilterReservations] = useState(reservations);
  const [filterOnlineWaitlist, setFilterOnlineWaitlist] = useState(onlineWaitlist);
  const [filterDelivery, setFilterDelivery] = useState(delivery);
  const [filterTakeout, setFilterTakeout] = useState(takeout);
  const [filterOutdoorSeating, setFilterOutdoorSeating] = useState(outdoorSeating);
  const [minRating, setMinRating] = useState(searchParams.get("minRating") ?? "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "");
  const [radiusMiles, setRadiusMiles] = useState(searchParams.get("radiusMiles") ?? "25");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const PAGE_SIZE = 20;

  const geo = useGeolocation();

  useEffect(() => {
    setSelectedCategory(category);
    setSelectedCity(city);
    setSelectedPrice(price);
    setFilterOpenNow(openNow);
    setFilterReservations(reservations);
    setFilterOnlineWaitlist(onlineWaitlist);
    setFilterDelivery(delivery);
    setFilterTakeout(takeout);
    setFilterOutdoorSeating(outdoorSeating);
  }, [category, city, price, openNow, reservations, onlineWaitlist, delivery, takeout, outdoorSeating]);

  function buildSearchParams(extraBounds?: Bounds, page = 1) {
    return {
      q,
      where,
      category,
      city,
      price: price ? Number(price) : undefined,
      openNow,
      reservations,
      onlineWaitlist,
      delivery,
      takeout,
      outdoorSeating,
      north: extraBounds?.north,
      south: extraBounds?.south,
      east: extraBounds?.east,
      west: extraBounds?.west,
      minRating: minRating ? Number(minRating) : undefined,
      sort: sortBy || (geo.lat && !where.trim() && !city.trim() ? "distance" : undefined),
      lat: !where.trim() && !city.trim() ? (geo.lat ?? undefined) : undefined,
      lng: !where.trim() && !city.trim() ? (geo.lng ?? undefined) : undefined,
      radiusMiles: !where.trim() && !city.trim() && radiusMiles ? Number(radiusMiles) : undefined,
      page,
      pageSize: 20,
    };
  }

  async function runSearch(extraBounds?: Bounds) {
    setLoading(true);
    setError("");
    setCurrentPage(1);

    try {
      const data = await searchBusinesses(buildSearchParams(extraBounds, 1));

      setResults(data.results ?? []);
      setCityCounts(data.cityCounts ?? []);
      setCategoryCounts(data.categoryCounts ?? []);
      setTotalResults(data.totalCount ?? (data.results ?? []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setCityCounts([]);
      setCategoryCounts([]);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  async function goToPage(pg: number) {
    if (pg < 1 || pg > totalPages) return;
    setCurrentPage(pg);
    setLoading(true);
    setError("");

    try {
      const data = await searchBusinesses(buildSearchParams(undefined, pg));
      setResults(data.results ?? []);
      setTotalResults(data.totalCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  // Wait for geo to resolve (or fail), then search
  useEffect(() => {
    // Still waiting for geolocation — don't search yet
    if (geo.loading || !geo.requested) return;

    if (
      !q.trim() &&
      !where.trim() &&
      !category.trim() &&
      !city.trim() &&
      !price.trim() &&
      !openNow &&
      !reservations &&
      !onlineWaitlist &&
      !delivery &&
      !takeout &&
      !outdoorSeating
    ) {
      setResults([]);
      setCityCounts([]);
      setCategoryCounts([]);
      return;
    }

    runSearch();
  }, [q, where, category, city, price, openNow, reservations, onlineWaitlist, delivery, takeout, outdoorSeating, geo.lat, geo.lng, geo.loading, geo.requested]);

  function applyFilters() {
    const params = new URLSearchParams();

    if (q.trim()) params.set("q", q.trim());
    if (where.trim()) params.set("where", where.trim());
    if (selectedCategory.trim()) params.set("category", selectedCategory.trim());
    if (selectedCity.trim()) params.set("city", selectedCity.trim());
    if (selectedPrice.trim()) params.set("price", selectedPrice.trim());
    if (filterOpenNow) params.set("openNow", "true");
    if (filterReservations) params.set("reservations", "true");
    if (filterOnlineWaitlist) params.set("onlineWaitlist", "true");
    if (filterDelivery) params.set("delivery", "true");
    if (filterTakeout) params.set("takeout", "true");
    if (filterOutdoorSeating) params.set("outdoorSeating", "true");
    if (minRating) params.set("minRating", minRating);
    if (sortBy) params.set("sort", sortBy);
    if (radiusMiles) params.set("radiusMiles", radiusMiles);

    router.push(`/search?${params.toString()}`);
  }

  return (
    <main className="page-container" style={{ maxWidth: 1200 }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>
        {(() => {
          const parts: string[] = [];

          // What are we searching for
          if (q.trim()) {
            parts.push(`"${q.trim()}"`);
          } else if (category.trim()) {
            // Try to find the readable name from categoryCounts
            const catMatch = categoryCounts.find((c) => c.slug === category);
            parts.push(catMatch ? catMatch.name : category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
          }

          // Where
          if (where.trim()) {
            parts.push(`in ${where.trim()}`);
          } else if (selectedCity) {
            parts.push(`in ${selectedCity}`);
          } else if (geo.lat && !where.trim() && !city.trim()) {
            parts.push("near you");
          }

          if (parts.length === 0) return "Search";
          return parts.join(" ");
        })()}
        {totalResults > 0 && (
          <span style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 10 }}>
            ({totalResults})
          </span>
        )}
      </h1>
      <SponsoredBanner
        placementSlug="search-sponsored"
        category={category}
        city={selectedCity}
      />

      <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="">All Cities</option>
              {(cityCounts ?? []).map((item) => (
                <option key={item.city} value={item.city}>
                  {item.city} ({item.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Price</label>
            <select
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="">All Prices</option>
              <option value="1">$</option>
              <option value="2">$$</option>
              <option value="3">$$$</option>
              <option value="4">$$$$</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Distance</label>
            <select
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="">Any Distance</option>
              <option value="5">5 miles</option>
              <option value="10">10 miles</option>
              <option value="25">25 miles</option>
              <option value="50">50 miles</option>
              <option value="100">100 miles</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Min Rating</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="">Any</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="">Most Reviewed</option>
              <option value="distance">Nearest</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name (A-Z)</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <button
            onClick={applyFilters}
            style={{
              padding: "10px 16px",
              border: "1px solid #ccc",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Apply Filters
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(categoryCounts ?? []).map((item) => {
            const isActive = selectedCategory === item.slug;

            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => setSelectedCategory(isActive ? "" : item.slug)}
                className={isActive ? "toggle-btn active" : "toggle-btn"}
                style={{ padding: "7px 14px", fontSize: 13 }}
              >
                {item.name} ({item.count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Open Now", checked: filterOpenNow, onChange: setFilterOpenNow },
            { label: "Reservations", checked: filterReservations, onChange: setFilterReservations },
            { label: "Online Waitlist", checked: filterOnlineWaitlist, onChange: setFilterOnlineWaitlist },
            { label: "Delivery", checked: filterDelivery, onChange: setFilterDelivery },
            { label: "Takeout", checked: filterTakeout, onChange: setFilterTakeout },
            { label: "Outdoor Seating", checked: filterOutdoorSeating, onChange: setFilterOutdoorSeating },
          ].map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => filter.onChange(!filter.checked)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: filter.checked ? "1px solid var(--color-primary)" : "1px solid var(--color-primary)",
                background: filter.checked ? "var(--color-primary)" : "rgba(26,26,46,0.08)",
                color: filter.checked ? "#fff" : "var(--color-primary)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {filter.checked && <span style={{ marginRight: 4 }}>✓</span>}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {geo.loading && (
        <div style={{ marginBottom: 12, fontSize: 13, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="spinner-sm" /> Detecting your location...
        </div>
      )}

      {geo.lat && !geo.loading && (
        <div style={{ marginBottom: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>
          Showing results near you ({radiusMiles ? `${radiusMiles} mi` : "any distance"})
          <button
            onClick={() => { setRadiusMiles(""); runSearch(); }}
            className="btn-ghost"
            style={{ fontSize: 12, padding: "2px 8px", marginLeft: 8 }}
          >
            Show all
          </button>
        </div>
      )}

      {!geo.lat && geo.requested && !geo.loading && (
        <div style={{ marginBottom: 12, fontSize: 13, color: "var(--color-text-muted)" }}>
          Location unavailable — showing all results.
          <button onClick={geo.requestLocation} className="btn-ghost" style={{ fontSize: 12, padding: "2px 8px", marginLeft: 8 }}>
            Try again
          </button>
        </div>
      )}

      <div className="search-layout">
        <div className="search-map-sticky">
          <SearchResultsMap
            businesses={results}
            onSearchArea={async (bounds) => {
              await runSearch(bounds);
            }}
          />
        </div>

        <div className="search-results-scroll">
          {loading ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="skeleton" style={{ height: 120 }} />
              <div className="skeleton" style={{ height: 120 }} />
              <div className="skeleton" style={{ height: 120 }} />
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <h3>No businesses found</h3>
              <p>Try expanding your search radius or changing your filters.</p>
            </div>
          ) : (
            <>
              {results.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 8 }}>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="btn-outline"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                  >
                    Prev
                  </button>

                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pg: number;
                    if (totalPages <= 7) {
                      pg = i + 1;
                    } else if (currentPage <= 4) {
                      pg = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pg = totalPages - 6 + i;
                    } else {
                      pg = currentPage - 3 + i;
                    }

                    return (
                      <button
                        key={pg}
                        onClick={() => goToPage(pg)}
                        className={pg === currentPage ? "toggle-btn active" : "toggle-btn"}
                        style={{ padding: "6px 12px", fontSize: 13, minWidth: 36 }}
                      >
                        {pg}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="btn-outline"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                  >
                    Next
                  </button>

                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>
                    {totalResults} results
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add a business CTA */}
      <div className="section-card" style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 4px" }}>Can&apos;t find a business?</h3>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
            Help the community by adding it to Reputater. You don&apos;t have to be the owner.
          </p>
        </div>
        <Link
          href="/business/new"
          className="btn-accent"
          style={{ textDecoration: "none", padding: "10px 20px", whiteSpace: "nowrap" }}
        >
          Add a Business
        </Link>
      </div>

      <style jsx>{`
        .search-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .search-map-sticky {
          position: sticky;
          top: 70px;
          height: calc(100vh - 90px);
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .search-results-scroll {
          display: grid;
          gap: 16px;
          min-height: calc(100vh - 90px);
        }
        .spinner-sm {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          .search-layout {
            grid-template-columns: 1fr;
          }
          .search-map-sticky {
            position: relative;
            top: 0;
            height: 300px;
          }
        }
      `}</style>
    </main>
  );
}
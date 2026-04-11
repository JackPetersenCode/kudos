"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  searchBusinesses,
  SearchBusinessResult,
  SearchCategoryCount,
  SearchCityCount,
} from "@/lib/search";
import BusinessCard from "@/components/BusinessCard";
import SearchResultsMap from "@/components/SearchResultsMap";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export default function SearchPage() {
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

  async function runSearch(extraBounds?: Bounds) {
    setLoading(true);
    setError("");

    try {
      const data = await searchBusinesses({
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
      });

      setResults(data.results ?? []);
      setCityCounts(data.cityCounts ?? []);
      setCategoryCounts(data.categoryCounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setCityCounts([]);
      setCategoryCounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
  }, [q, where, category, city, price, openNow, reservations, onlineWaitlist, delivery, takeout, outdoorSeating]);

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

    router.push(`/search?${params.toString()}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Search</h1>

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
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: isActive ? "#111" : "#fff",
                  color: isActive ? "#fff" : "#111",
                  cursor: "pointer",
                }}
              >
                {item.name} ({item.count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label><input type="checkbox" checked={filterOpenNow} onChange={(e) => setFilterOpenNow(e.target.checked)} /> Open Now</label>
          <label><input type="checkbox" checked={filterReservations} onChange={(e) => setFilterReservations(e.target.checked)} /> Reservations</label>
          <label><input type="checkbox" checked={filterOnlineWaitlist} onChange={(e) => setFilterOnlineWaitlist(e.target.checked)} /> Offers Online Waitlist</label>
          <label><input type="checkbox" checked={filterDelivery} onChange={(e) => setFilterDelivery(e.target.checked)} /> Offers Delivery</label>
          <label><input type="checkbox" checked={filterTakeout} onChange={(e) => setFilterTakeout(e.target.checked)} /> Offers Takeout</label>
          <label><input type="checkbox" checked={filterOutdoorSeating} onChange={(e) => setFilterOutdoorSeating(e.target.checked)} /> Outdoor Seating</label>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <SearchResultsMap
          businesses={results}
          onSearchArea={async (bounds) => {
            await runSearch(bounds);
          }}
        />

        <div style={{ display: "grid", gap: 16, maxHeight: 720, overflowY: "auto" }}>
          {loading ? (
            <p>Searching...</p>
          ) : error ? (
            <pre style={{ color: "red" }}>{error}</pre>
          ) : results.length === 0 ? (
            <p>No businesses found.</p>
          ) : (
            results.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
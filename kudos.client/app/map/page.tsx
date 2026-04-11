"use client";

import { useEffect, useState } from "react";
import BusinessMap from "@/components/BusinessMap";
import BusinessCard from "@/components/BusinessCard";
import { searchBusinesses, type SearchBusinessResult } from "@/lib/search";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export default function MapPage() {
  const [results, setResults] = useState<SearchBusinessResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function runSearch(bounds?: Bounds) {
    setLoading(true);
    setError("");

    try {
      const data = await searchBusinesses({
        north: bounds?.north,
        south: bounds?.south,
        east: bounds?.east,
        west: bounds?.west,
      });
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Map</h1>

      {error && <pre style={{ color: "red" }}>{error}</pre>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <BusinessMap
          businesses={results}
          onSearchArea={async (bounds) => {
            await runSearch(bounds);
          }}
        />

        <div style={{ display: "grid", gap: 16, maxHeight: 700, overflowY: "auto" }}>
          {loading ? (
            <p>Loading businesses...</p>
          ) : results.length === 0 ? (
            <p>No businesses found in this area.</p>
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
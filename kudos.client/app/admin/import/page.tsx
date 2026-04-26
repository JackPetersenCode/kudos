"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";

type ImportResult = {
  message?: string;
  [key: string]: unknown;
};

function ImportContent() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function runImport(endpoint: string, label: string) {
    setLoading(label);
    setResult(null);
    setError("");

    try {
      const res = await apiFetch(endpoint, { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="page-container" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>

      <h1>Data Import</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>
        Import and manage business data. Long-running imports run in the background — check server logs for progress.
      </p>

      {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}
      {result && (
        <div className="success-message" style={{ marginBottom: 16 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {/* Yelp Dataset Upsert */}
        <div className="section-card">
          <h2>Yelp Dataset — Update Existing Businesses</h2>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Reads the Yelp academic dataset and fills in missing hours, addresses, coordinates, and price levels
            for businesses already in your database. Matches by name + city.
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            File: <code>C:/Users/jackp/Desktop/kudos/yelp-data/Yelp JSON/yelp_academic_dataset_business.json</code>
          </p>
          <button
            onClick={() => runImport(
              "/admin/import/yelp-dataset-upsert?filePath=C:/Users/jackp/Desktop/kudos/yelp-data/Yelp JSON/yelp_academic_dataset_business.json",
              "yelp-upsert"
            )}
            disabled={loading !== null}
            className="btn-accent"
          >
            {loading === "yelp-upsert" ? "Running..." : "Import Business Data"}
          </button>
        </div>

        {/* Yelp Photos */}
        <div className="section-card">
          <h2>Yelp Dataset — Import Photos</h2>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Uploads all business photos from the Yelp dataset to Cloudflare R2. Skips already-uploaded photos.
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Files: <code>photos.json</code> + <code>yelp_photos.tar</code>
          </p>
          <button
            onClick={() => runImport(
              "/admin/import/yelp-photos-import?photosJsonPath=C:/Users/jackp/Desktop/kudos/yelp-data/Yelp Photos/photos.json&photosTarPath=C:/Users/jackp/Desktop/kudos/yelp-data/Yelp Photos/yelp_photos.tar&batchSize=999999",
              "yelp-photos"
            )}
            disabled={loading !== null}
            className="btn-accent"
          >
            {loading === "yelp-photos" ? "Running..." : "Import Photos (2,000 batch)"}
          </button>
        </div>

        {/* OSM Import All */}
        <div className="section-card">
          <h2>OpenStreetMap — Import All US Cities</h2>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Imports businesses from 380+ US cities via the Overpass API. Takes ~15-20 minutes.
            Safe to run multiple times — duplicates are skipped.
          </p>
          <button
            onClick={() => runImport("/admin/import/osm/all", "osm-all")}
            disabled={loading !== null}
            className="btn-accent"
          >
            {loading === "osm-all" ? "Running..." : "Import All Cities"}
          </button>
        </div>

        {/* Cleanup */}
        <div className="section-card">
          <h2>Cleanup</h2>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>
            Removes bad business names (price tags, non-businesses) and deduplicates entries with the same name + city.
          </p>
          <button
            onClick={() => runImport("/admin/import/cleanup", "cleanup")}
            disabled={loading !== null}
            className="btn-outline"
          >
            {loading === "cleanup" ? "Running..." : "Run Cleanup"}
          </button>
        </div>

        {/* Stats */}
        <div className="section-card">
          <h2>Import Stats</h2>
          <button
            onClick={async () => {
              setLoading("stats");
              setError("");
              try {
                const res = await apiFetch("/admin/import/stats", { method: "GET" });
                setResult(await res.json());
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed");
              } finally {
                setLoading(null);
              }
            }}
            disabled={loading !== null}
            className="btn-outline"
          >
            {loading === "stats" ? "Loading..." : "View Stats"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AdminImportPage() {
  return (
    <RequireAuth>
      <ImportContent />
    </RequireAuth>
  );
}

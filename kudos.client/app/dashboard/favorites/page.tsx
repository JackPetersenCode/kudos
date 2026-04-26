"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFavorites, FavoriteBusiness } from "@/lib/features";
import RequireAuth from "@/components/RequireAuth";

function FavoritesContent() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getFavorites();
        setFavorites(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <main style={{ padding: 24 }}>Loading favorites...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </div>

      <h1>Saved Businesses</h1>

      {favorites.length === 0 ? (
        <p>You haven&apos;t saved any businesses yet. Browse and click &quot;Save&quot; on a business page!</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {favorites.map((biz) => (
            <Link
              key={biz.id}
              href={`/business/${biz.slug}`}
              className="card"
              style={{ textDecoration: "none", color: "#111" }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {biz.primaryPhotoUrl && (
                  <img
                    src={biz.primaryPhotoUrl}
                    alt={biz.name}
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{biz.name}</div>
                  <div style={{ color: "#666", marginTop: 4 }}>
                    {[biz.city, biz.state].filter(Boolean).join(", ")}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <strong>{Number(biz.averageRating).toFixed(1)}</strong> ({biz.reviewCount} reviews)
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function FavoritesPage() {
  return (
    <RequireAuth>
      <FavoritesContent />
    </RequireAuth>
  );
}

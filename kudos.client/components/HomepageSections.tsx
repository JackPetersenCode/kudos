"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getPlaceholderImage } from "@/lib/placeholderImages";
import { searchBusinesses, SearchBusinessResult } from "@/lib/search";
import { useGeolocation } from "@/hooks/useGeolocation";
import BusinessCard from "@/components/BusinessCard";

const HomepageMap = dynamic(
  () => import("@/components/MapInner").then((m) => m.HomepageMapInner),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 400, borderRadius: 12 }} /> }
);

type TrendingBusiness = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  averageRating: number;
  recentReviewCount: number;
  categories: string[];
};

type RecentBusiness = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  categories: string[];
};

export default function HomepageSections() {
  const [trending, setTrending] = useState<TrendingBusiness[]>([]);
  const [recent, setRecent] = useState<RecentBusiness[]>([]);
  const [nearby, setNearby] = useState<SearchBusinessResult[]>([]);
  const geo = useGeolocation();

  useEffect(() => {
    async function load() {
      try {
        const [trendingRes, recentRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/homepage/trending`, { cache: "no-store" }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/homepage/recent`, { cache: "no-store" }),
        ]);

        if (trendingRes.ok) setTrending(await trendingRes.json());
        if (recentRes.ok) setRecent(await recentRes.json());
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  // Load nearby businesses when geolocation resolves
  useEffect(() => {
    if (!geo.lat || !geo.lng || geo.loading) return;

    async function loadNearby() {
      try {
        const data = await searchBusinesses({
          lat: geo.lat!,
          lng: geo.lng!,
          radiusMiles: 10,
          sort: "distance",
          pageSize: 8,
        });
        setNearby(data.results ?? []);
      } catch {
        // ignore
      }
    }
    loadNearby();
  }, [geo.lat, geo.lng, geo.loading]);

  return (
    <>
      {nearby.length > 0 && (
        <NearYouSection nearby={nearby} lat={geo.lat!} lng={geo.lng!} />
      )}

      {trending.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Trending This Month</h2>
          <div className="homepage-grid">
            {trending.map((biz) => (
              <Link
                key={biz.id}
                href={`/business/${biz.slug}`}
                className="homepage-biz-card"
              >
                <div
                  className="homepage-biz-img"
                  style={{ backgroundImage: `url(${biz.photoUrl || getPlaceholderImage(biz.categories)})` }}
                />
                <div className="homepage-biz-body">
                  <div className="homepage-biz-name">{biz.name}</div>
                  <div className="homepage-biz-location">
                    {[biz.city, biz.state].filter(Boolean).join(", ")}
                  </div>
                  <div className="homepage-biz-meta">
                    <span>{biz.recentReviewCount} recent reviews</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Recently Added</h2>
          <div className="homepage-grid">
            {recent.map((biz) => (
              <Link
                key={biz.id}
                href={`/business/${biz.slug}`}
                className="homepage-biz-card"
              >
                <div
                  className="homepage-biz-img"
                  style={{ backgroundImage: `url(${biz.photoUrl || getPlaceholderImage(biz.categories)})` }}
                />
                <div className="homepage-biz-body">
                  <div className="homepage-biz-name">{biz.name}</div>
                  <div className="homepage-biz-location">
                    {[biz.city, biz.state].filter(Boolean).join(", ")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .homepage-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        :global(.homepage-biz-card) {
          text-decoration: none;
          color: inherit;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--color-surface);
          transition: all var(--transition);
        }
        :global(.homepage-biz-card:hover) {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-text-muted);
        }
        .homepage-biz-img {
          height: 140px;
          background: var(--color-border);
          background-size: cover;
          background-position: center;
        }
        .homepage-biz-body {
          padding: 14px;
        }
        .homepage-biz-name {
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .homepage-biz-location {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin-bottom: 6px;
        }
        .homepage-biz-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
        }
        @media (max-width: 900px) {
          .homepage-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 500px) {
          .homepage-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

function NearYouSection({ nearby, lat, lng }: { nearby: SearchBusinessResult[]; lat: number; lng: number }) {
  return (
    <section style={{ marginTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Near You</h2>
        <Link href="/search" style={{ fontSize: 14, fontWeight: 600 }}>
          View all →
        </Link>
      </div>

      <div className="near-you-grid">
        <div>
          <HomepageMap businesses={nearby} lat={lat} lng={lng} />
        </div>

        <div style={{ display: "grid", gap: 12, maxHeight: 400, overflowY: "auto" }}>
          {nearby.slice(0, 6).map((biz) => (
            <BusinessCard key={biz.id} business={biz} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .near-you-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .near-you-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchBusinessResult } from "@/lib/search";

// Fix Leaflet default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// ==========================================
// Simple single-marker map for business pages
// ==========================================

export function BusinessLocationMapInner({ latitude, longitude }: { name: string; latitude: number; longitude: number }) {
  const position: [number, number] = [latitude, longitude];

  return (
    <MapContainer center={position} zoom={14} style={{ width: "100%", height: 320, borderRadius: 12 }} scrollWheelZoom={false}>
      <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
      <Marker position={position} />
    </MapContainer>
  );
}

// ==========================================
// Search results map with "Search this area"
// ==========================================

type Bounds = { north: number; south: number; east: number; west: number };

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: Bounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
}

function FitBounds({ businesses }: { businesses: SearchBusinessResult[] }) {
  const map = useMap();

  useEffect(() => {
    const coords = businesses
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => [Number(b.latitude), Number(b.longitude)] as [number, number]);

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [businesses, map]);

  return null;
}

export function SearchResultsMapInner({ businesses, onSearchArea }: {
  businesses: SearchBusinessResult[];
  onSearchArea: (bounds: Bounds) => Promise<void> | void;
}) {
  const [pendingBounds, setPendingBounds] = useState<Bounds | null>(null);
  const [showSearchBtn, setShowSearchBtn] = useState(false);

  const bizWithCoords = useMemo(
    () => businesses.filter((b) => b.latitude != null && b.longitude != null),
    [businesses]
  );

  const center: [number, number] = useMemo(() => {
    if (bizWithCoords.length === 0) return [30.2672, -97.7431];
    return [Number(bizWithCoords[0].latitude), Number(bizWithCoords[0].longitude)];
  }, [bizWithCoords]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {showSearchBtn && (
        <button
          onClick={async () => {
            if (pendingBounds) {
              await onSearchArea(pendingBounds);
              setShowSearchBtn(false);
            }
          }}
          className="toggle-btn active"
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "8px 16px",
            fontSize: 13,
            boxShadow: "var(--shadow-md)",
          }}
        >
          Search this area
        </button>
      )}

      <MapContainer center={center} zoom={12} style={{ width: "100%", height: "100%", borderRadius: 12, minHeight: 400 }} scrollWheelZoom={true}>
        <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
        <FitBounds businesses={businesses} />
        <BoundsWatcher onBoundsChange={(b) => { setPendingBounds(b); setShowSearchBtn(true); }} />

        {bizWithCoords.map((biz) => (
          <Marker key={biz.id} position={[Number(biz.latitude), Number(biz.longitude)]}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <Link href={`/business/${biz.slug}`} style={{ fontWeight: 700, fontSize: 14, textDecoration: "none", color: "var(--color-text)" }}>
                  {biz.name}
                </Link>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  {[biz.city, biz.state].filter(Boolean).join(", ")}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "var(--color-warning)" }}>{"★".repeat(Math.round(Number(biz.averageRating)))}</span>
                  {" "}{Number(biz.averageRating).toFixed(1)} ({biz.reviewCount})
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// ==========================================
// Simple multi-marker map for homepage
// ==========================================

export function HomepageMapInner({ businesses, lat, lng }: {
  businesses: SearchBusinessResult[];
  lat: number;
  lng: number;
}) {
  const center: [number, number] = [lat, lng];

  const bizWithCoords = useMemo(
    () => businesses.filter((b) => b.latitude != null && b.longitude != null),
    [businesses]
  );

  return (
    <MapContainer center={center} zoom={12} style={{ width: "100%", height: 400, borderRadius: 12 }} scrollWheelZoom={false}>
      <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
      {bizWithCoords.map((biz) => (
        <Marker key={biz.id} position={[Number(biz.latitude), Number(biz.longitude)]}>
          <Popup>
            <Link href={`/business/${biz.slug}`} style={{ fontWeight: 700, fontSize: 13, textDecoration: "none", color: "var(--color-text)" }}>
              {biz.name}
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

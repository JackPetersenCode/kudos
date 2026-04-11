"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useMemo, useRef, useState } from "react";
import type { SearchBusinessResult } from "@/lib/search";
import Link from "next/link";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type Props = {
  businesses: SearchBusinessResult[];
  onSearchArea: (bounds: Bounds) => Promise<void> | void;
};

const containerStyle = {
  width: "100%",
  height: "520px",
  borderRadius: "12px",
};

const defaultCenter = {
  lat: 30.2672,
  lng: -97.7431,
};

export default function BusinessMap({ businesses, onSearchArea }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [pendingBounds, setPendingBounds] = useState<Bounds | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<SearchBusinessResult | null>(null);

  const center = useMemo(() => {
    const withCoords = businesses.filter(
      (b) => b.latitude !== null && b.longitude !== null
    );

    if (withCoords.length === 0) return defaultCenter;

    return {
      lat: Number(withCoords[0].latitude),
      lng: Number(withCoords[0].longitude),
    };
  }, [businesses]);

  function handleLoad(map: google.maps.Map) {
    mapRef.current = map;
  }

  function handleIdle() {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    setPendingBounds({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    });
    setShowSearchArea(true);
  }

  async function handleSearchArea() {
    if (!pendingBounds) return;
    await onSearchArea(pendingBounds);
    setShowSearchArea(false);
  }

  if (!isLoaded) {
    return <div style={{ height: 520 }}>Loading map...</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      {showSearchArea && (
        <button
          onClick={handleSearchArea}
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          Search this area
        </button>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={handleLoad}
        onIdle={handleIdle}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {businesses
          .filter((b) => b.latitude !== null && b.longitude !== null)
          .map((business) => (
            <Marker
              key={business.id}
              position={{
                lat: Number(business.latitude),
                lng: Number(business.longitude),
              }}
              onClick={() => setSelectedBusiness(business)}
            />
          ))}
      </GoogleMap>

      {selectedBusiness && (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <Link
            href={`/business/${selectedBusiness.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <strong>{selectedBusiness.name}</strong>
          </Link>
          <div style={{ marginTop: 6 }}>
            {selectedBusiness.city ?? ""}{selectedBusiness.city && selectedBusiness.state ? ", " : ""}{selectedBusiness.state ?? ""}
          </div>
          <div style={{ marginTop: 6 }}>
            {selectedBusiness.reviewCount} review{selectedBusiness.reviewCount === 1 ? "" : "s"} •{" "}
            {Number(selectedBusiness.averageRating).toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
}
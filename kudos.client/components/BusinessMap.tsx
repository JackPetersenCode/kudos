"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useMemo, useRef, useState } from "react";
import type { SearchBusinessResult } from "@/lib/search";
import { googleMapsLoaderOptions } from "@/lib/googleMaps";

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
  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [pendingBounds, setPendingBounds] = useState<Bounds | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<SearchBusinessResult | null>(null);

  const businessesWithCoords = useMemo(
    () => businesses.filter((b) => b.latitude !== null && b.longitude !== null),
    [businesses]
  );

  const center = useMemo(() => {
    if (businessesWithCoords.length === 0) return defaultCenter;

    const first = businessesWithCoords[0];
    const lat = Number(first.latitude);
    const lng = Number(first.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return defaultCenter;
    }

    return { lat, lng };
  }, [businessesWithCoords]);

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
        {businessesWithCoords.map((business) => {
          const lat = Number(business.latitude);
          const lng = Number(business.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }

          return (
            <Marker
              key={business.id}
              position={{ lat, lng }}
              onClick={() => setSelectedBusiness(business)}
            />
          );
        })}
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
          <strong>{selectedBusiness.name}</strong>
          <div style={{ marginTop: 6 }}>
            {[selectedBusiness.city, selectedBusiness.state].filter(Boolean).join(", ")}
          </div>
          <div style={{ marginTop: 6 }}>
            {selectedBusiness.reviewCount} review
            {selectedBusiness.reviewCount === 1 ? "" : "s"} •{" "}
            {Number(selectedBusiness.averageRating).toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
}
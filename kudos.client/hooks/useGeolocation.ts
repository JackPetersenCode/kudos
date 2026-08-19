"use client";

import { useEffect, useState } from "react";

type GeoState = {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  requested: boolean;
};

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
    requested: false,
  });

  // Approximate location from the caller's IP (server-side lookup). Lets search
  // still show "near you" when the browser withholds precise geolocation —
  // mirrors Yelp, which resolves a city from IP (e.g. "Austin, TX") in incognito.
  async function fallbackToIp() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/public/geoip`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const d = await res.json();
        if (typeof d?.lat === "number" && typeof d?.lng === "number") {
          setState({ lat: d.lat, lng: d.lng, loading: false, error: null, requested: true });
          return;
        }
      }
    } catch {
      // ignore
    }
    setState((prev) => ({ ...prev, loading: false, requested: true }));
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      fallbackToIp();
      return;
    }

    setState((prev) => ({ ...prev, loading: true, requested: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
          requested: true,
        });
      },
      () => {
        // Browser geolocation denied/failed — fall back to IP-based location.
        fallbackToIp();
      },
      { timeout: 10000, maximumAge: 300000 } // 5 min cache
    );
  }

  // Auto-request on mount
  useEffect(() => {
    // Check if we already have cached coords in sessionStorage
    const cached = sessionStorage.getItem("reputater_geo");
    if (cached) {
      try {
        const { lat, lng } = JSON.parse(cached);
        setState({ lat, lng, loading: false, error: null, requested: true });
        return;
      } catch {
        // ignore
      }
    }

    requestLocation();
  }, []);

  // Cache to sessionStorage when we get coords
  useEffect(() => {
    if (state.lat !== null && state.lng !== null) {
      sessionStorage.setItem("reputater_geo", JSON.stringify({ lat: state.lat, lng: state.lng }));
    }
  }, [state.lat, state.lng]);

  return { ...state, requestLocation };
}

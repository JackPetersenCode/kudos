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

  function requestLocation() {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: "Geolocation not supported", requested: true }));
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
      (err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
          requested: true,
        }));
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

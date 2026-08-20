import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { apiUrl } from "../lib/api";

export type GeolocationState = {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  requested: boolean;
  permissionStatus: Location.PermissionStatus | null;
  error: string | null;
  requestLocation: () => void;
};

export function useGeolocation(autoRequest = true): GeolocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(autoRequest);
  const [requested, setRequested] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Precise device location (prompts for permission). Uses the last-known
  // position for an instant fix and races getCurrentPositionAsync against an
  // 8s timeout so it can NEVER hang on the "..." spinner.
  const requestLocation = useCallback(async () => {
    setLoading(true);
    setRequested(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(perm.status);
      if (perm.status !== "granted") {
        setError("Location permission denied");
        return;
      }

      // Instant cached fix (if the OS has one).
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setLat(last.coords.latitude);
        setLng(last.coords.longitude);
      }

      // Fresh fix, but bounded so a slow/failed GPS read doesn't hang forever.
      const fresh = await Promise.race<Location.LocationObject | null>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (fresh) {
        setLat(fresh.coords.latitude);
        setLng(fresh.coords.longitude);
      }
    } catch (e: any) {
      setError(e?.message || "Could not get location");
    } finally {
      setLoading(false);
    }
  }, []);

  // Approximate location from the device's IP (no prompt) so category / near-me
  // searches are location-scoped by default — mirrors the web. Only fills in if
  // precise device coords haven't already been set.
  const fallbackToIp = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/public/geoip"));
      if (res.ok) {
        const d = await res.json();
        if (typeof d?.lat === "number" && typeof d?.lng === "number") {
          setLat((cur) => (cur ?? d.lat));
          setLng((cur) => (cur ?? d.lng));
        }
      }
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    // Seed an approximate location from IP on mount (no permission prompt) so
    // searches default to "near you". If autoRequest is on, also ask for the
    // precise device location, which overrides the IP estimate when granted.
    fallbackToIp();
    if (autoRequest) requestLocation();
  }, [autoRequest, requestLocation, fallbackToIp]);

  return { lat, lng, loading, requested, permissionStatus, error, requestLocation };
}

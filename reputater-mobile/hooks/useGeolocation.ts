import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

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
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    } catch (e: any) {
      setError(e?.message || "Could not get location");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoRequest) requestLocation();
  }, [autoRequest, requestLocation]);

  return { lat, lng, loading, requested, permissionStatus, error, requestLocation };
}

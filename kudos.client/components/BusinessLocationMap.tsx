"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { googleMapsLoaderOptions } from "@/lib/googleMaps";

type Props = {
  name: string;
  latitude: number;
  longitude: number;
};

const containerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "12px",
};

export default function BusinessLocationMap({ name, latitude, longitude }: Props) {
  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (!isLoaded) {
    return <div style={{ height: 320 }}>Loading map...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: latitude, lng: longitude }}
      zoom={14}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      <Marker position={{ lat: latitude, lng: longitude }} title={name} />
    </GoogleMap>
  );
}
"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(
  () => import("@/components/MapInner").then((m) => m.BusinessLocationMapInner),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 320, borderRadius: 12 }} /> }
);

type Props = {
  name: string;
  latitude: number;
  longitude: number;
};

export default function BusinessLocationMap({ name, latitude, longitude }: Props) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return <MapInner name={name} latitude={latitude} longitude={longitude} />;
}

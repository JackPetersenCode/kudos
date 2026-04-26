"use client";

import dynamic from "next/dynamic";
import type { SearchBusinessResult } from "@/lib/search";

const MapInner = dynamic(
  () => import("@/components/MapInner").then((m) => m.SearchResultsMapInner),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 520, borderRadius: 12 }} /> }
);

type Bounds = { north: number; south: number; east: number; west: number };

type Props = {
  businesses: SearchBusinessResult[];
  onSearchArea: (bounds: Bounds) => Promise<void> | void;
};

export default function BusinessMap({ businesses, onSearchArea }: Props) {
  return <MapInner businesses={businesses} onSearchArea={onSearchArea} />;
}

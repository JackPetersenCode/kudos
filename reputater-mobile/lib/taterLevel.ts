const R2_BASE = "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev";

const LEVELS = [
  { name: "Tater Tot", min: 0, image: `${R2_BASE}/tater-tot.png` },
  { name: "Small Fry", min: 3, image: `${R2_BASE}/small-fry.png` },
  { name: "Mashed Master", min: 10, image: `${R2_BASE}/mashed-master.png` },
  { name: "Tater Titan", min: 25, image: `${R2_BASE}/tater-titan.png` },
  { name: "Loaded Legend", min: 50, image: `${R2_BASE}/loaded-legend.png` },
  { name: "Golden Tater", min: 100, image: `${R2_BASE}/golden-tater.png` },
];

export type TaterLevel = { name: string; min: number; image: string };

export function getTaterLevel(reviewCount: number): TaterLevel {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (reviewCount >= l.min) level = l;
  }
  return level;
}

export const ALL_LEVELS = LEVELS;

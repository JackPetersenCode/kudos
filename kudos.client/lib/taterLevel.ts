const LEVELS = [
  { name: "Tater Tot", min: 0, image: "/tater-tot.png" },
  { name: "Small Fry", min: 3, image: "/small-fry.png" },
  { name: "Mashed Master", min: 10, image: "/mashed-master.png" },
  { name: "Tater Titan", min: 25, image: "/tater-titan.png" },
  { name: "Loaded Legend", min: 50, image: "/loaded-legend.png" },
  { name: "Golden Tater", min: 100, image: "/golden-tater.png" },
] as const;

export type TaterLevel = (typeof LEVELS)[number];

export function getTaterLevel(reviewCount: number): TaterLevel {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (reviewCount >= l.min) level = l;
  }
  return level;
}

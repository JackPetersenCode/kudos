import { apiUrl } from "./api";

export type LeaderboardEntry = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  photoUrl: string | null;
  businessName: string;
  businessSlug: string;
  city: string | null;
  state: string | null;
  kudosCount: number;
  topTags: string;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl("/public/staff/leaderboard?limit=30"));
  if (!res.ok) return [];
  return res.json();
}

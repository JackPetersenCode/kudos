import * as SecureStore from "expo-secure-store";

// Uses expo-secure-store (already used for auth tokens, so it's proven linked in
// our builds) rather than adding a new native module. The lists are tiny.
const SEARCH_KEY = "recent_searches";
const VIEW_KEY = "recent_views";
const MAX = 8;

export type RecentView = {
  slug: string;
  name: string;
  city: string | null;
  distanceMiles?: number | null;
};

export async function getRecentSearches(): Promise<string[]> {
  try {
    const s = await SecureStore.getItemAsync(SEARCH_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(term: string): Promise<void> {
  const t = term.trim();
  if (!t) return;
  try {
    const list = await getRecentSearches();
    const next = [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
    await SecureStore.setItemAsync(SEARCH_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function getRecentViews(): Promise<RecentView[]> {
  try {
    const s = await SecureStore.getItemAsync(VIEW_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export async function addRecentView(view: RecentView): Promise<void> {
  if (!view?.slug) return;
  try {
    const list = await getRecentViews();
    const next = [view, ...list.filter((x) => x.slug !== view.slug)].slice(0, MAX);
    await SecureStore.setItemAsync(VIEW_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

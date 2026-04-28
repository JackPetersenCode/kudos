import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = (Constants.expoConfig?.extra as any)?.apiBaseUrl as string;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync("token");
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      msg = parsed?.message || text || msg;
    } catch { /* ignore */ }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res;
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

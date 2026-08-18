// src/lib/auth.ts
import { apiFetch } from "./api";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
}

function storeAuth(_token: string, email: string) {
  // The JWT is stored by the backend in an httpOnly cookie and never touches JS
  // (so XSS can't steal it). We keep only the non-sensitive email as a UI marker
  // for "who's signed in" — the cookie is the actual credential.
  localStorage.setItem("userEmail", email);
  notifyAuthChanged();
}

export async function register(email: string, password: string, acceptedTerms: boolean = true) {
  const res = await apiFetch("/Auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, acceptedTerms }),
  });

  const data = await res.json();

  if (data?.token) {
    storeAuth(data.token, data.email ?? email);
  }

  return data;
}

export async function login(email: string, password: string) {
  const res = await apiFetch("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data?.token) {
    storeAuth(data.token, data.email ?? email);
  }

  return data;
}

export async function getMe() {
  const res = await apiFetch("/Profile");
  return res.json();
}

export function logout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  // Clear the httpOnly auth cookie server-side (fire-and-forget).
  apiFetch("/Auth/logout", { method: "POST" }).catch(() => {});
  notifyAuthChanged();
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getStoredUserEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userEmail");
}
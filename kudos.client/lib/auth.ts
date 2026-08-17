// src/lib/auth.ts
import { apiFetch } from "./api";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
}

function storeAuth(token: string, email: string) {
  localStorage.setItem("token", token);
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
// src/lib/auth.ts
import { apiFetch } from "./api";

export async function register(email: string, password: string) {
  const res = await apiFetch("/Auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("userEmail", data.email);
  return data;
}

export async function login(email: string, password: string) {
  const res = await apiFetch("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("userEmail", data.email);
  return data;
}

export async function getMe() {
  const res = await apiFetch("/Profile");
  return res.json();
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
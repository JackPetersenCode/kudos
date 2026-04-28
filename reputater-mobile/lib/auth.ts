import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./api";

export type Me = {
  userId: string;
  email: string;
  role: string;
  displayName?: string | null;
};

export async function login(email: string, password: string) {
  const res = await apiFetch("/Auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data?.token) {
    await SecureStore.setItemAsync("token", data.token);
    await SecureStore.setItemAsync("userEmail", data.email ?? email);
  }
  return data;
}

export async function register(email: string, password: string) {
  const res = await apiFetch("/Auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, acceptedTerms: true }),
  });
  const data = await res.json();
  if (data?.token) {
    await SecureStore.setItemAsync("token", data.token);
    await SecureStore.setItemAsync("userEmail", data.email ?? email);
  }
  return data;
}

export async function logout() {
  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("userEmail");
}

export async function getStoredToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("token");
}

export async function getMe(): Promise<Me> {
  const res = await apiFetch("/Profile");
  return res.json();
}

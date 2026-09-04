export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("chat_token") || "";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? JSON.parse(text) : (undefined as T);
}

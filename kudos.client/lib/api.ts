const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let parsed: Record<string, unknown> | null = null;
    let text = "";

    try {
      text = await response.text();
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const error = new Error(
      (parsed?.message as string) || text || "Request failed"
    ) as Error & {
      reason?: string;
      status?: number;
      data?: Record<string, unknown> | null;
    };

    error.reason = parsed?.reason as string | undefined;
    error.status = response.status;
    error.data = parsed;

    throw error;
  }

  return response;
}
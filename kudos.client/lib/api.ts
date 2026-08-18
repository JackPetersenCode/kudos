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
    // Send the httpOnly auth cookie (browser clients). Backend CORS allows credentials.
    credentials: "include",
  });

  if (!response.ok) {
    // If the server rejects our token (expired / signed with rotated key /
    // user deleted on server), clear the stale token client-side and notify
    // useAuth so isAuthenticated flips to false. Callers can then react
    // (e.g. ReviewForm pops up the sign-in modal).
    // Only do this when we actually sent a token — a 401 from a public
    // endpoint with no token means something else.
    if (response.status === 401 && typeof window !== "undefined") {
      // Clear stale auth state (token cookie expired / rotated key / user deleted).
      // Works for both cookie sessions (userEmail marker) and legacy Bearer sessions.
      const wasAuthed = !!token || !!localStorage.getItem("userEmail");
      if (wasAuthed) {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("userEmail");
          window.dispatchEvent(new Event("auth-changed"));
        } catch {
          // ignore storage failures
        }
      }
    }

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
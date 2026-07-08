import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// External origins the app legitimately loads. Derived from a codebase audit:
//  - Maps: Leaflet + OpenStreetMap tiles ({s}.tile.openstreetmap.org) and
//    Leaflet's default marker icons (unpkg.com). Images are allowed from any
//    https host (see img-src) because business photos can be served from R2 or
//    from arbitrary external CDNs on imported listings — images can't execute,
//    so this is a safe relaxation while scripts/frames stay locked down.
//  - Stripe (@stripe/stripe-js): script from js.stripe.com, XHR to api.stripe.com,
//    and Payment Element renders inside iframes from js.stripe.com / hooks.stripe.com.
//  - The backend API, whose origin comes from NEXT_PUBLIC_API_BASE_URL.

// Resolve the API origin (scheme + host + port) from the configured base URL so
// connect-src allows the backend regardless of environment (localhost in dev,
// the real host in prod). Falls back to allowing nothing extra if unparseable.
function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const API_ORIGIN = apiOrigin();

// Build the Content-Security-Policy directive by directive. Each entry lists the
// exact origins that directive needs and why.
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    // Only same-origin by default; everything else is opened up explicitly below.
    "default-src": ["'self'"],
    // Scripts: Next.js runtime + Google Maps loader + Stripe. 'unsafe-inline' is
    // required by the Next.js App Router bootstrap; 'unsafe-eval' is only needed
    // in dev (React refresh / fast-refresh). This can be tightened later by
    // switching to per-request nonces.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://js.stripe.com",
    ],
    // Styles: 'unsafe-inline' covers the many inline <style> blocks / style props
    // used throughout the app and styles injected by Google Maps.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Fonts are self-hosted by next/font (Inter); data: covers inlined glyphs.
    "font-src": ["'self'", "data:"],
    // Images: local, data/blob URIs, any https host (map tiles, Leaflet markers,
    // R2 bucket, and external CDN photos on imported listings), plus the API
    // origin so http://localhost images work in dev. Images can't execute, so a
    // broad https: allowance here does not weaken script/frame protections.
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:",
      ...(API_ORIGIN ? [API_ORIGIN] : []),
    ],
    // XHR/fetch/WebSocket targets: backend API and Stripe API. ws: is the dev HMR socket.
    "connect-src": [
      "'self'",
      "blob:",
      ...(API_ORIGIN ? [API_ORIGIN] : []),
      "https://api.stripe.com",
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    // Iframes: Stripe Payment Element renders inside Stripe-hosted frames.
    "frame-src": ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    // Web workers (Google Maps / Next may spin up blob-backed workers).
    "worker-src": ["'self'", "blob:"],
    // Lock down the rest.
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply the security headers to every route.
        source: "/:path*",
        headers: [
          // Force HTTPS for two years, including subdomains, and allow preload.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Stop browsers from MIME-sniffing responses away from their declared type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Disallow framing by other origins (clickjacking protection).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Send only the origin on cross-origin navigations.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Deny camera/mic; allow geolocation only for our own origin.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          // Restrict where content can be loaded from (see buildCsp above).
          { key: "Content-Security-Policy", value: buildCsp() },
        ],
      },
    ];
  },
};

export default nextConfig;

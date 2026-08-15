// Sentry init for the Node.js server runtime. No-op unless SENTRY_DSN /
// NEXT_PUBLIC_SENTRY_DSN is set, so it stays inert in dev/CI until a DSN
// is provisioned in prod.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

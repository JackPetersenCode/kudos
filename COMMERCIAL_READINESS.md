# Kudos — Commercial Readiness Checklist

Status of taking Kudos (backend `Kudos.Server`, web `kudos.client`, mobile `reputater-mobile`)
to a commercial launch. Items marked ✅ were addressed in the hardening pass; ⬜ remain.

Legend: 🔴 Blocker · 🟠 Important · 🟢 Later

---

## 1. Secrets & Security
- 🔴 ✅ **Rotate all credentials that leaked into git history** — DONE (R2, OpenAI, Google Maps, JWT, Twilio rotated; DB is localhost-only, no action). Stripe stays on test keys until launch. See [SECRET_ROTATION.md](SECRET_ROTATION.md).
- 🔴 ✅ `.dockerignore` added so `.env` / dev config / build output are never baked into the image.
- 🔴 ✅ Docker base image pinned to GA (`dotnet/sdk:10.0` / `aspnet:10.0`), was `-preview`.
- 🔴 ⬜ **Provision real production secrets** in Railway/Vercel env vars (prod `appsettings.Production.json` is still placeholders; config reads env vars already).
- 🟠 ✅ Baseline security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) + HSTS on the API.
- 🟠 ✅ Web security headers + CSP added in `next.config.ts` (Google Maps / Stripe / R2 allow-listed).
- 🟠 ⬜ **Move web JWT out of `localStorage`** into an httpOnly/Secure/SameSite cookie (XSS exposure). *(Deferred — larger auth refactor; touches web + backend.)*
- 🟠 ⬜ **Restrict the Google Maps browser key** (HTTP referrer + API scope) in Google Cloud Console.

## 2. Backend Production Hardening
- 🔴 ✅ Global exception handler (`UseExceptionHandler`) returns generic ProblemDetails; real error logged server-side.
- 🔴 ✅ Controller error-detail leaks (`ex.Message` returned to clients) genericized + logged.
- 🟠 ✅ Admin controllers now `[Authorize(Roles = "admin")]` (declarative) on top of existing manual checks.
- 🟠 ✅ Registration input validation (email format + 8-char min password).
- 🟠 ✅ `ForwardedHeaders` middleware so rate-limiting / HTTPS detection work behind the Railway proxy.
- 🟠 ✅ `/health` (liveness) and `/health/db` (readiness) endpoints for platform probes.
- 🟠 ⬜ **Distributed rate limiting** — current limiter is in-memory (per-instance). Fine for a single instance; move to a shared store (Redis) if you scale out.
- 🟠 ⬜ **Token revocation / refresh** — JWTs live 7 days with no revocation; a demoted admin keeps access until expiry. Consider short access tokens + refresh tokens.
- 🟠 ⬜ **External-API resilience** — add timeouts/retries on OpenAI/Stripe/Twilio; decide graceful degradation when OpenAI sentiment is down (review posting currently hard-fails).
- 🟢 ⬜ Structured logging shipped to a provider (Serilog + sink); remove dead EF `AppDbContext`; bump `Microsoft.AspNetCore.OpenApi` off the `9.0.0-rc` pin.

## 3. Payments (Stripe)
- 🔴 ✅ **Capture-failure bug fixed** — ads no longer go `active` when the charge fails (both the self-serve `confirm-hold` path and the admin approval path now abort with HTTP 402 instead of activating an unpaid ad).
- 🔴 ✅ Idempotency keys on PaymentIntent create + capture (prevents double-charge on retry).
- 🔴 ✅ **Stripe webhook endpoint** (`/api/stripe/webhook`) — verifies signature, pauses ads on `payment_failed` / `canceled` / dispute / refund. *(Set `Stripe:WebhookSecret` and register the endpoint URL in the Stripe dashboard.)*
- 🟠 ⬜ **Switch to live Stripe keys** after live onboarding under the business entity.
- 🟢 ⬜ Add a refund path (only capture / cancel-hold exist); consider not mutating `StripeConfiguration.ApiKey` as a process-global.

## 4. Database & Deployment
- 🔴 ✅ **Reproducible schema captured** — full `Kudos.Server/sql/schema.sql` dumped from the live DB (40 tables). A fresh prod DB can now be provisioned from the repo.
- 🔴 ✅ Startup migrator path fixed (resolves `sql/` in the published image; scripts shipped via `.csproj`) and failures now logged as errors, not silently swallowed.
- 🟠 ⬜ **Clean the schema before prod** — the dump includes import cruft: `businesses_old`, `users_old`, `reviews_old`, `restaurants`, `autoServices`, `homeServices`, `images`, `more`. Drop these from a production schema.
- 🟠 ⬜ **Set up automated DB backups** (Railway/managed Postgres backup + a tested restore).
- 🟠 ⬜ **CI/CD** — no `.github/workflows`. Add build/test/deploy pipelines for API (Railway) and web (Vercel).
- 🟢 ⬜ `docker-compose` for local Postgres + API + web; deployment runbook.

## 5. Web Frontend
- 🟠 ✅ Route boundaries added (`not-found.tsx`, `error.tsx`, `loading.tsx`).
- 🟠 ⬜ **Server-render SEO-critical pages** (`business/[slug]`, `/search`, `/profile`, `/leaderboard`) — currently client-rendered; body content isn't indexable. *(Deferred — larger refactor.)*
- 🟠 ⬜ **Adopt `next/image`** for photo-heavy pages (LCP/bandwidth).
- 🟢 ⬜ Cookie-consent banner for EU/GDPR; set `NEXT_PUBLIC_SITE_URL` explicitly; accessibility pass (focus trapping on modals, more ARIA).

## 6. Mobile / App Store
- 🔴 ✅ `eas.json` build/submit profiles added; `ios.buildNumber` / `android.versionCode` set.
- 🔴 ✅ Push-notification `projectId` wiring fixed (reads from expo config; warns instead of throwing if unset).
- 🔴 ⬜ **App icon → 1024×1024 square** (was 1024×1536 — fails store upload). *(See mobile report — may need a real designed asset.)*
- 🔴 ⬜ **Run `eas init`** to populate the real EAS `projectId` / `owner` (placeholders in `app.json`), then wire APNs key (iOS) and FCM `google-services.json` (Android).
- 🟠 ⬜ **Resolve brand mismatch** — app is "Reputater" (`com.reputater.app`, `reputater.com`) vs. product/backend "Kudos". Align store listing, domain, and API host (also affects universal-link verification).
- 🟠 ⬜ Review App Store guideline 3.1.1 risk on the ads "Pay now" external-payment out-link.
- 🟠 ⬜ Wire deep-link / notification-tap handlers (password-reset / email-verify currently require pasting a token).

## 7. Legal, Compliance & Business
- 🔴 ⬜ **Replace Yelp Open Dataset seed data** — its license prohibits commercial use/redistribution. Source first-party or licensed data before launch. *(12 GB local data is correctly gitignored, but must not seed a commercial product.)*
- 🟠 ⬜ Confirm Twilio **A2P 10DLC** registration is approved before SMS at volume.
- 🟠 ⬜ Stripe live onboarding + business bank account under the LLC; support email/address; counsel review of terms/privacy (payments + PII + SMS).
- 🟢 ⬜ Trademark check on the shipping brand; content-moderation/abuse policy for user photos & reviews.

## 8. Testing, Observability & Quality
- 🟠 ⬜ **Add automated tests** — zero exist. Prioritize auth, payments, and the review/sentiment path.
- 🟠 ⬜ Error tracking + uptime monitoring (Sentry) on API/web/mobile; alert on payment failures.
- 🟢 ✅ Repo hygiene: committed `node_modules` untracked; `.claude/settings.local.json` untracked.
- 🟢 ⬜ Add a root README (added) and per-project docs.

---

### Critical path (recommended order)
1. **Rotate leaked secrets** ([SECRET_ROTATION.md](SECRET_ROTATION.md)) — everything else is moot if these are live.
2. Provision prod secrets + deploy the hardened build; verify `/health/db` is green.
3. Register the Stripe webhook + switch to live keys when ready to charge.
4. Clean the DB schema; enable backups.
5. Mobile store blockers (square icon, `eas init`, APNs/FCM).
6. Replace Yelp seed data; legal review.
7. Then: cookie-based JWT, SSR SEO pages, tests, monitoring.

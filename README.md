# Kudos

A positive-only business review platform (a "Yelp for kudos"). Businesses are rated
on five tag categories — service, quality, cleanliness, value, experience — and
negative reviews are filtered out via AI sentiment analysis. Includes a self-serve
advertising system with auction bidding and Stripe payments.

> **Before going commercial, read [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md)
> and [SECRET_ROTATION.md](SECRET_ROTATION.md).** Some credentials leaked into git
> history and must be rotated.

## Monorepo layout

| Path | Stack | What it is |
|---|---|---|
| `Kudos.Server/` | .NET 10, raw SQL (Npgsql/PostgreSQL) | REST API |
| `kudos.client/` | Next.js 16, React 19, Tailwind v4 | Web app |
| `reputater-mobile/` | Expo SDK 54 / React Native | iOS + Android app |
| `yelp-data/` | (local only, gitignored) | Bulk import data — **not for commercial use, see license note** |

## Prerequisites
- .NET 10 SDK, Node.js 20+, PostgreSQL 16
- Accounts: Stripe, OpenAI, Twilio, SendGrid, Cloudflare R2, Google Maps

## Backend (`Kudos.Server`)

```bash
cd Kudos.Server
# Provision the database schema (fresh DB):
psql "<connection-string>" -f sql/schema.sql
psql "<connection-string>" -f sql/seed_categories.sql
dotnet run
```

Configuration is read from `appsettings.json`, `appsettings.{Environment}.json`,
an optional `.env` (dev only), and **environment variables** (which override the
files — use these in production). Required settings:

| Config key | Env-var form | Purpose |
|---|---|---|
| `ConnectionStrings:WebApiDatabase` | `ConnectionStrings__WebApiDatabase` | Postgres |
| `Jwt:Key` / `Jwt:Issuer` / `Jwt:Audience` | `Jwt__Key` … | JWT signing |
| `CloudflareR2:*` | `CloudflareR2__*` | Image storage |
| `Stripe:SecretKey` / `Stripe:WebhookSecret` | `Stripe__*` | Payments + webhook |
| `OpenAI:ApiKey` (or `.env`) | `OpenAI__ApiKey` | Sentiment + ad review |
| `Twilio:*` | `Twilio__*` | SMS claim verification |
| `SendGrid:ApiKey` | `SendGrid__ApiKey` | Email |
| `GoogleMaps:ApiKey` | `GoogleMaps__ApiKey` | Geocoding |
| `App:FrontendUrl` / `App:AllowedOrigins` | `App__*` | CORS + email links |

Health probes: `GET /health` (liveness), `GET /health/db` (DB readiness).
Stripe webhook: point the dashboard at `POST /api/stripe/webhook`.

## Web (`kudos.client`)

```bash
cd kudos.client
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_BASE_URL, Maps, Stripe publishable
npm install && npm run dev
```

## Mobile (`reputater-mobile`)

```bash
cd reputater-mobile
npm install
eas init          # populates the real EAS projectId/owner (placeholders currently)
npx expo start
```
API base URL is in `app.json` → `extra.apiBaseUrl`. Build/submit config is in `eas.json`.

## Deployment
Implied hosting: **Railway** (API) + **Vercel** (web). Neither is codified in-repo yet
— see the CI/CD item in [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md).

# 🔐 Secret Rotation — REQUIRED before launch

Real credentials were committed to git history early in this repo's life and are
still recoverable from old commits, even though current `HEAD` is clean. The
"secrets cleanup" commit (`40b1947`) only removed the files from the latest tree —
**it did not purge history.** Anyone who ever cloned/forked the repo, or who can
read the history, can extract these keys.

**Every secret below must be rotated (revoked + reissued at the provider), not just
deleted from the repo.** Rotating invalidates the leaked copy.

## What leaked and where

| Secret | Provider | Found in history |
|---|---|---|
| OpenAI API key (`sk-proj-…`) | OpenAI | `Kudos.Server/.env` @ commit `581c852` |
| Cloudflare R2 Access Key ID + Secret Access Key | Cloudflare R2 | committed `bin/Debug/.../appsettings*.json` @ first commit `711deed` |
| Postgres connection string / password (`redsox45`) | Database | same build-output files |
| JWT signing key | (self-issued) | same build-output files |
| Twilio Account SID + Auth Token | Twilio | on-disk dev config (verify history) |
| Google Maps API key | Google Cloud | on-disk dev config + client `.env.local` |
| Stripe **test** key (`sk_test_…`) | Stripe | on-disk dev config |

## Rotation checklist

- [x] **OpenAI** — DONE. Leaked key revoked, new key issued.
- [x] **Cloudflare R2** — DONE. New token scoped to `kudos-images`; old token(s) (`cd0a4e43…` / `36d99810…`) deleted.
- [x] **Postgres** — *Low priority / no action needed now.* There is no production database yet (prod config is placeholders), and the dev DB (`redsox45`) listens only on `localhost`, so the leaked password is not remotely exploitable. When prod is provisioned on Railway, its Postgres plugin generates a fresh password automatically — never reuse `redsox45`. Optionally rotate the local dev password for tidiness (`ALTER USER postgres WITH PASSWORD '…'`), but it's not a real exposure.
- [x] **JWT** — DONE. New 64-byte random signing key generated and set as `Jwt__Key` in Railway (invalidates old forged-token risk).
- [x] **Twilio** — DONE. Auth Token rotated in the Twilio console.
- [x] **Google Maps** — DONE / no rotation needed. Already split into two restricted keys: a server "Geocoding API Key" (API-restricted) and a browser "Maps Platform API Key" (HTTP-referrer + API restricted). Restrictions verified; billing budget alert set. Leaked values are low-risk because both keys are restricted.
- [ ] **Stripe** — you are still on **test** keys. Before taking real money, complete Stripe live onboarding under the business entity, then set the **live** `sk_live_…` secret key and the webhook signing secret (`whsec_…`). Never commit live keys.

## Scrub git history (after rotating)

Rotating makes the leaked keys useless, which is the important part. Optionally also
rewrite history so the strings are gone entirely (recommended before making the repo
public or adding collaborators):

```bash
# Using git-filter-repo (install separately). This rewrites ALL commits.
pip install git-filter-repo
git filter-repo --path Kudos.Server/.env --invert-paths
git filter-repo --path-glob 'bin/Debug/**' --invert-paths
# Then force-push and have every collaborator re-clone.
```

⚠️ History rewriting changes every commit hash and requires a force-push. Coordinate
with anyone who has a clone. **Rotation is mandatory; history scrub is optional but advised.**

## Going forward
- All real secrets now live only in gitignored on-disk files (`appsettings.json`,
  `appsettings.Development.json`, `.env`, `kudos.client/.env.local`) and must be moved
  into the hosting platform's secrets manager (Railway / Vercel env vars) for prod.
- A `.dockerignore` now prevents `.env` / dev config / build output from being baked
  into the Docker image.

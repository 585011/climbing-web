# Production Deployment — Hetzner VM + Caddy + CD

**Date:** 2026-07-04
**Scope issues:** [climbing-api#39](https://github.com/585011/climbing-api/issues/39), [climbing-web#22](https://github.com/585011/climbing-web/issues/22)
**Status:** Approved design

## Goal

Deploy the climbing app (SPA + Kotlin API + Postgres) to production on a single
Hetzner VM, with automatic HTTPS via Caddy and continuous deployment from
GitHub Actions on every push to `main` in both repos.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Hosting | One Hetzner Cloud VM (CX22, 2 vCPU / 4 GB, Ubuntu 24.04 LTS) — nothing provisioned yet |
| Domain | `kruxy.app` (user-owned), injected everywhere via a single `DOMAIN` value. Note: `.app` is HSTS-preloaded — browsers require HTTPS, which Caddy provides automatically |
| Deploy config home | New third repo: `climbing-deploy` |
| Provisioning | Manual VM creation in Hetzner console + checked-in idempotent bootstrap script (no Terraform/cloud-init) |
| Registry | GHCR (`ghcr.io/585011/*`); both repos are public so images are public — VM pulls without credentials |
| Auth0 | Reuse the existing Auth0 application; add the prod URL to its allowed callback/logout/origin URLs |
| Backups | Nightly local `pg_dump` with 7-day rotation; off-site copy is an explicit follow-up, not in scope |
| Deploy mechanism | SSH-push from GitHub Actions (build → push GHCR → SSH → `compose pull` + `up -d` + health check). Watchtower and GitOps platforms rejected for lack of deploy visibility / overkill |

## Runtime architecture

```
                    ┌─────────────────────────────── Hetzner VM ──┐
Internet ──443/80──▶│  web (Caddy)                                 │
                    │   ├── serves SPA static files                │
                    │   ├── HTTPS via Let's Encrypt (certs in volume)
                    │   └── /api/* ──▶ api:8080 (Spring Boot)      │
                    │                     └──▶ postgres:5432       │
                    └──────────────────────────────────────────────┘
```

One docker compose stack, three services:

- **web** — the climbing-web image, rebuilt on **Caddy instead of nginx**
  (per issue #22 "Add Caddy to Dockerfile"). Caddy is the internet-facing
  edge: serves the SPA with fallback to `index.html`, terminates TLS,
  reverse-proxies `/api/*` to `api:8080`. Publishes 80 and 443 (TCP + UDP for
  HTTP/3). Named volumes for `/data` (certs — must persist across redeploys)
  and `/config`.
- **api** — the climbing-api image with `SPRING_PROFILES_ACTIVE=prod`.
  **No published ports**; reachable only on the internal compose network.
  Flyway migrations run on container startup, as today.
- **postgres** — `postgres:16`, internal only, named data volume, healthcheck
  gating api startup (same pattern as the existing dev compose).

**Same-origin consequence:** frontend and API share `https://<DOMAIN>` in
prod, so the frontend is built with `VITE_API_URL=/api` and CORS does not
apply in production. (The API keeps its existing CORS config for local dev.)

## What lives where

### climbing-web (changes)

- **`Caddyfile`** (new, replaces `nginx.conf`) —
  - Site address `{$DOMAIN}`, defaulting to `:80` when unset, so
    `docker run -p 8000:80` keeps working locally with plain HTTP and no
    domain. In prod, `DOMAIN=<real domain>` from the VM's `.env` turns on
    automatic HTTPS.
  - Ports all security headers from `nginx.conf` verbatim in intent: the CSP
    (including its documented exceptions: `style-src 'unsafe-inline'` for
    react-zoom-pan-pinch, `img-src https:` for R2 presigned URLs,
    `frame-src https:` for Auth0 silent auth, `frame-ancestors 'none'`),
    `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
    `Permissions-Policy`. Carries the nginx.conf comments over.
  - Long-cache header (`Cache-Control: public, immutable`, 1 year) for hashed
    static assets (js/css/svg/fonts/images), as nginx.conf does today. In
    Caddy, headers set at site level are not discarded per-path, so the
    nginx duplication footgun disappears.
  - `encode zstd gzip` compression (requested in issue #22; nginx.conf never
    had it).
  - SPA routing: `try_files {path} /index.html` + `file_server`.
  - `handle /api/*` → `reverse_proxy api:8080` (path passed through as-is —
    backend controllers already use the `/api` prefix).
- **`Dockerfile`** — final stage `nginx:alpine` → `caddy:2-alpine`; copy
  `dist` to `/srv` and the Caddyfile to `/etc/caddy/Caddyfile`; run
  `caddy validate` during the build so config syntax errors fail the image
  build. `EXPOSE 80 443`.
- **`nginx.conf`** — deleted.
- **`.github/workflows/deploy.yml`** — new (this repo currently has **no**
  workflows). See CD section.
- **README/CLAUDE.md** — update the docker run instructions and nginx
  references.

### climbing-api (changes)

- **`.github/workflows/deploy.yml`** — new CD workflow. The existing
  `gradle.yml` CI keeps running on pushes and PRs; the deploy workflow runs
  `./gradlew build` itself so a deploy can never outrun a red build.

### climbing-deploy (new repo)

- **`docker-compose.yml`** — the three-service prod stack above. Images:
  `ghcr.io/585011/climbing-web:latest`, `ghcr.io/585011/climbing-api:latest`.
  Secrets come from `.env`; non-secret wiring is set directly in the compose
  file: `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/${POSTGRES_DB}`
  (the app's default points at localhost) and `SPRING_PROFILES_ACTIVE=prod`,
  mirroring the existing dev compose in climbing-api.
- **`.env.example`** — documented template: `DOMAIN`, `POSTGRES_DB`,
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, `SPRING_DATASOURCE_USERNAME`,
  `SPRING_DATASOURCE_PASSWORD`, `AUTH0_ISSUER_URI`, `AUTH0_AUDIENCE`,
  `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
  The real `.env` exists only on the VM, never in git or GitHub.
- **`scripts/bootstrap.sh`** — idempotent server setup run as root on a fresh
  VM: install Docker Engine + compose plugin, create a non-root `deploy`
  user (docker group, SSH key auth only), configure ufw (allow 22/80/443,
  deny rest), clone this repo to `/opt/climbing`, install the backup cron.
- **`scripts/backup.sh`** — nightly cron: `docker compose exec -T postgres
  pg_dump` → gzip to `/opt/climbing/backups/`, delete dumps older than
  7 days.
- **`README.md`** — the runbook:
  1. Create CX22 in Hetzner console (Ubuntu 24.04), add SSH key.
  2. Point DNS A record for the domain at the VM IP.
  3. Run `bootstrap.sh`.
  4. Copy `.env.example` → `/opt/climbing/.env`, fill in real values.
  5. Add `https://<DOMAIN>` to the Auth0 app's callback / logout / web
     origins.
  6. Set GitHub secrets (below) in all three repos and the `VITE_AUTH0_*`
     variables in climbing-web.
  7. First `docker compose up -d`; verify.
  Plus procedures: rollback, restore from backup, full VM rebuild.
- **`.github/workflows/deploy.yml`** — on push to main: SSH to VM,
  `git pull` in `/opt/climbing`, `docker compose up -d` (applies config
  changes with the same visibility as app deploys).

## CD pipelines

### climbing-web `deploy.yml`

Trigger: push to `main` + `workflow_dispatch`. Jobs in sequence:

1. **test** — `npm ci`, `npm run lint`, `npm test`, `npm run build`
   (build = type-check via `tsc -b`).
2. **build-push** — `docker/build-push-action`; build args
   `VITE_API_URL=/api` and `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` /
   `VITE_AUTH0_AUDIENCE` from **repo variables** (these values ship in the
   public JS bundle, so they are variables, not secrets). Push
   `:latest` + `:<git-sha>` to GHCR using the built-in `GITHUB_TOKEN`
   (`packages: write` permission).
3. **deploy** — SSH to VM: `docker compose pull web && docker compose up -d
   web`; then poll `https://<DOMAIN>/` until HTTP 200, fail after ~60 s.

### climbing-api `deploy.yml`

Same shape: **build+test** (`./gradlew build`) → **build-push**
(`:latest` + `:<git-sha>`) → **deploy** (`pull api` + `up -d api`), health
check polls `https://<DOMAIN>/api/climbing-areas` for HTTP 200. A failed
Flyway migration keeps the container from becoming healthy → red run.

### Shared workflow properties

- `concurrency` group per repo so overlapping pushes can't interleave
  deploys (cancel-in-progress for superseded runs of the build stages).
- Deploy jobs guarded with `if: github.repository_owner == '585011'` so
  forks don't attempt deploys.
- Deploy target hostname comes from the `DEPLOY_HOST` secret; the public
  health-check URL from a repo variable holding the domain.

## Secrets and configuration

| Location | Values |
|---|---|
| GitHub secrets (all three repos) | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` — dedicated ed25519 keypair created at bootstrap, authorized only for the `deploy` user |
| GitHub variables (climbing-web) | `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, prod domain for health check |
| VM `/opt/climbing/.env` only | DB credentials, Auth0 issuer/audience (API side), R2 keys, `DOMAIN` |

GitHub never holds server-side secrets; the VM never holds GitHub
credentials (public GHCR images need no pull auth).

## Failure handling

- **Red tests / lint** — deploy never starts (job dependency).
- **Image starts but doesn't serve** — post-deploy health check fails, run
  goes red. Fix forward or roll back.
- **Failed Flyway migration** — api container exits; health check fails;
  Postgres data untouched (Flyway migrations are transactional on
  Postgres). Redeploy previous image while fixing.
- **Cert issuance failure** — Caddy retries with backoff; certs persist in
  the `/data` volume so restarts never re-issue unnecessarily.
- **VM loss** — fresh VM + bootstrap + restore latest dump + repoint DNS,
  per runbook. Recovery point = last nightly dump. Accepted risk: dumps
  live on the same disk; off-site copy (e.g. to R2) is a tracked follow-up.

**Rollback:** every image is tagged `:<git-sha>`; roll back by re-running
the deploy workflow from the last good commit (`workflow_dispatch`), or on
the VM by pulling a pinned SHA tag. Both documented in the runbook.

## Testing strategy

Testable before the VM exists:

- **Caddyfile / web image** — `caddy validate` runs inside `docker build`;
  local `docker run -p 8000:80` + `curl -I` verifies SPA fallback, security
  headers, cache headers, and compression — same manual check used for the
  nginx image today.
- **Full stack** — `docker compose up` locally with a `.env` pointing at
  dev Auth0 validates service wiring, migrations, and the `/api` proxy;
  everything except real TLS works on `localhost`.
- **Workflows** — each has `workflow_dispatch` so stages can be exercised
  one at a time once the VM exists.

## Definition of done

Push a trivial commit to `main` in each repo → both workflows green → the
change is live at `https://<DOMAIN>` within ~3 minutes, with: valid HTTPS,
login via Auth0 works, area/wall/route browsing works, image upload works
(R2), tick logging works, security headers present (`curl -I`), and a
nightly backup file appears in `/opt/climbing/backups/`.

## Out of scope (tracked follow-ups)

- Off-site backup copies (upload dumps to R2)
- Monitoring/alerting beyond GitHub Actions run status
- Staging environment
- Separate Auth0 application or tenant for prod

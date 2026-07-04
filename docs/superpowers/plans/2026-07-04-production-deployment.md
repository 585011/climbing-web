# Production Deployment (Hetzner + Caddy + CD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the climbing app to production on one Hetzner VM (Caddy-served SPA + Spring Boot API + Postgres via docker compose) with SSH-push CD from GitHub Actions on every push to main.

**Architecture:** The climbing-web image swaps nginx for Caddy, which becomes the internet-facing edge (SPA static files, automatic HTTPS, `/api/*` reverse proxy to the api container). A new `climbing-deploy` repo holds the compose stack, `.env` template, bootstrap/backup scripts, and runbook. Each app repo gets a deploy workflow: test → build+push image to GHCR (`:latest` + `:<git-sha>`) → SSH to the VM → `docker compose pull <service> && up -d <service>` → health check.

**Tech Stack:** Caddy 2 (alpine image), Docker + compose, GitHub Actions, GHCR, Ubuntu 24.04 on Hetzner CX22, plain `ssh` in workflows (no third-party SSH action).

**Spec:** `docs/superpowers/specs/2026-07-04-production-deployment-design.md` (approved).

## Global Constraints

- Production domain: `kruxy.app` (`.app` is HSTS-preloaded — HTTPS mandatory, Caddy provides it).
- Images: `ghcr.io/585011/climbing-web` and `ghcr.io/585011/climbing-api`, tagged `latest` + `${{ github.sha }}`. Both repos are public → images public → VM pulls without registry auth.
- Frontend prod build args: `VITE_API_URL=/api`, plus `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` from GitHub repo **variables** (they ship in the public JS bundle — variables, not secrets).
- GitHub **secrets** (same trio in all three repos): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`. GitHub **variable** in climbing-web and climbing-api: `PROD_DOMAIN=kruxy.app`.
- VM layout: stack at `/opt/climbing`, non-root user `deploy`, backups in `/opt/climbing/backups`.
- Server-side secrets (DB password, Auth0 issuer/audience, R2 keys) live ONLY in `/opt/climbing/.env` on the VM — never in git or GitHub.
- Deploy jobs guarded with `if: github.repository_owner == '585011'`; workflows use `concurrency` to serialize deploys.
- No third-party SSH GitHub Action — plain `ssh` with the key written from the secret.
- Working directories: **web** = `/home/martin/Dokumenter/climbing-repo/climbing-web` (branch `feature/22-caddy-deploy`, created in Task 1 from `docs/production-deployment-spec`), **api** = `/home/martin/Dokumenter/climbing-repo/climbing-api` (branch `feature/39-cd-pipeline`, created in Task 3 from `main`), **deploy** = `/home/martin/Dokumenter/climbing-repo/climbing-deploy` (new repo, Task 4).
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- These are config/infra tasks: the "test" in each cycle is a concrete validation command (`docker build`, `curl -I`, `docker compose config`, `bash -n`, actionlint) with expected output stated. Run it before AND after the change where meaningful.

---

### Task 1: Replace nginx with Caddy in the climbing-web image

**Files:**
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-web/Caddyfile`
- Modify: `/home/martin/Dokumenter/climbing-repo/climbing-web/Dockerfile`
- Modify: `/home/martin/Dokumenter/climbing-repo/climbing-web/CLAUDE.md` (docker command lines only)
- Delete: `/home/martin/Dokumenter/climbing-repo/climbing-web/nginx.conf`

**Interfaces:**
- Consumes: existing Vite build (`dist/`), existing security header values from `nginx.conf`.
- Produces: an image where Caddy listens on 80 (and 443 when `DOMAIN` is set), serves the SPA from `/srv`, and proxies `/api/*` to `api:8080`. Env contract: `DOMAIN` env var = Caddy site address; unset → defaults to `:80` (plain HTTP, local dev). Build-arg contract: `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`. Tasks 2 and 4 rely on exactly these names.

- [ ] **Step 1: Create the branch**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
git checkout docs/production-deployment-spec
git checkout -b feature/22-caddy-deploy
```

- [ ] **Step 2: Baseline check — build the current nginx image and record header behavior**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
docker build -t climbing-web-nginx-baseline . 2>&1 | tail -3
docker run -d --rm --name web-baseline -p 8000:80 climbing-web-nginx-baseline
sleep 2
curl -sI http://localhost:8000/ | grep -i -E 'content-security-policy|x-frame-options'
docker stop web-baseline
```

Expected: build succeeds; both headers present. This is the parity target.

- [ ] **Step 3: Write the Caddyfile**

Create `/home/martin/Dokumenter/climbing-repo/climbing-web/Caddyfile`:

```caddyfile
# Site address comes from the DOMAIN env var (set in the prod compose stack).
# DOMAIN=kruxy.app enables automatic HTTPS via Let's Encrypt; when DOMAIN is
# unset (local `docker run`), it falls back to :80 and serves plain HTTP.
{$DOMAIN::80} {
	encode zstd gzip

	# Security headers, ported from nginx.conf. CSP notes: style-src
	# 'unsafe-inline' is required for React inline style props
	# (react-zoom-pan-pinch); img-src https: covers the R2 presigned image
	# URLs; frame-src https: allows Auth0's silent-auth iframe;
	# frame-ancestors 'none' prevents clickjacking.
	header {
		Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https:; frame-src https:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=()"
	}

	# Hashed build assets are immutable — cache for a year. index.html is
	# deliberately not matched so deploys propagate immediately.
	@static path_regexp \.(js|css|svg|woff2|woff|ttf|eot|ico|png|jpg|jpeg|gif)$
	header @static Cache-Control "public, immutable, max-age=31536000"

	# Same-origin API: proxy to the Spring Boot container on the compose
	# network. In standalone local runs there is no `api` host, so /api/*
	# returns 502 — expected outside the compose stack.
	handle /api/* {
		reverse_proxy api:8080
	}

	# SPA: serve static files, fall back to index.html for client-side routes.
	handle {
		root * /srv
		try_files {path} /index.html
		file_server
	}
}
```

- [ ] **Step 4: Rewrite the Dockerfile final stage**

Replace the full contents of `/home/martin/Dokumenter/climbing-repo/climbing-web/Dockerfile` with:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ENV VITE_API_URL=$VITE_API_URL \
    VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
# Fail the image build on Caddyfile syntax errors.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
COPY --from=builder /app/dist /srv
```

(The caddy base image's default CMD already runs `caddy run --config /etc/caddy/Caddyfile --adapter caddyfile`; ports 80/443 are already EXPOSEd by the base image. Note the three new `VITE_AUTH0_*` build args — the old Dockerfile only wired `VITE_API_URL`, so Auth0 config silently missing from docker builds is fixed here too.)

- [ ] **Step 5: Delete nginx.conf**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
git rm nginx.conf
```

- [ ] **Step 6: Build and verify the Caddy image**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
docker build -t climbing-web-caddy-test . 2>&1 | tail -3
docker run -d --rm --name web-caddy-test -p 8000:80 climbing-web-caddy-test
sleep 2
echo "--- headers on / ---"
curl -sI http://localhost:8000/ | grep -i -E 'content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy'
echo "--- SPA fallback ---"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:8000/areas/1
echo "--- asset cache header + compression ---"
ASSET=$(curl -s http://localhost:8000/ | grep -o 'assets/[^"]*\.js' | head -1)
curl -sI -H 'Accept-Encoding: gzip' "http://localhost:8000/$ASSET" | grep -i -E 'cache-control|content-encoding'
echo "--- api proxy wired (502 expected standalone) ---"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/climbing-areas
docker stop web-caddy-test
```

Expected: all 5 security headers present on `/`; `/areas/1` → `200 text/html` (fallback works); asset shows `Cache-Control: public, immutable, max-age=31536000` and `Content-Encoding: gzip`; `/api/...` → `502` (proxy exists, no upstream — correct standalone).

- [ ] **Step 7: Update CLAUDE.md docker commands**

In `/home/martin/Dokumenter/climbing-repo/climbing-web/CLAUDE.md`, replace the two docker lines in the Commands block:

```bash
docker build --build-arg VITE_API_URL=<url> -t climbing-web .   # Build image
docker run -p 8000:80 climbing-web                               # Run container
```

with:

```bash
docker build -t climbing-web .   # Build image (args: VITE_API_URL, VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE)
docker run -p 8000:80 climbing-web   # Run (Caddy, plain HTTP; set -e DOMAIN=<host> for automatic HTTPS)
```

- [ ] **Step 8: Run the frontend test suite (regression guard)**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web && npm test
```

Expected: PASS (no src changes, but cheap insurance).

- [ ] **Step 9: Commit**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
git add Caddyfile Dockerfile CLAUDE.md
git commit -m "$(cat <<'EOF'
Replace nginx with Caddy in the production image

Caddy serves the SPA, terminates TLS via the DOMAIN env var, proxies
/api/* to the api container, and carries over all security headers from
nginx.conf plus zstd/gzip compression. Closes half of #22.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: climbing-web CD workflow

**Files:**
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-web/.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Dockerfile build args from Task 1 (`VITE_API_URL`, `VITE_AUTH0_*`).
- Produces: pushes `ghcr.io/585011/climbing-web:latest` + `:<sha>`; SSHes as `deploy` to `/opt/climbing` and restarts service `web` (compose service name defined in Task 4 must match). Uses secrets `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`, variables `VITE_AUTH0_*` + `PROD_DOMAIN`.

- [ ] **Step 1: Write the workflow**

Create `/home/martin/Dokumenter/climbing-repo/climbing-web/.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

# Serialize runs so two pushes can't interleave their deploy steps.
concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  build-push:
    needs: test
    if: github.repository_owner == '585011'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/585011/climbing-web:latest
            ghcr.io/585011/climbing-web:${{ github.sha }}
          build-args: |
            VITE_API_URL=/api
            VITE_AUTH0_DOMAIN=${{ vars.VITE_AUTH0_DOMAIN }}
            VITE_AUTH0_CLIENT_ID=${{ vars.VITE_AUTH0_CLIENT_ID }}
            VITE_AUTH0_AUDIENCE=${{ vars.VITE_AUTH0_AUDIENCE }}

  deploy:
    needs: build-push
    if: github.repository_owner == '585011'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        env:
          SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_USER@$DEPLOY_HOST" \
            'cd /opt/climbing && docker compose pull web && docker compose up -d web'
      - name: Health check
        run: |
          for i in $(seq 1 12); do
            code=$(curl -s -o /dev/null -w '%{http_code}' "https://${{ vars.PROD_DOMAIN }}/") || code=000
            if [ "$code" = "200" ]; then echo "Healthy"; exit 0; fi
            echo "Attempt $i: HTTP $code — retrying in 5s"
            sleep 5
          done
          echo "Health check failed after 60s"
          exit 1
```

- [ ] **Step 2: Validate the workflow with actionlint**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color
```

Expected: no output, exit 0. (If the actionlint image can't be pulled, fall back to `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"` — expected: silent exit 0.)

- [ ] **Step 3: Commit**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
git add .github/workflows/deploy.yml
git commit -m "$(cat <<'EOF'
Add CD workflow: test, push image to GHCR, deploy via SSH

On push to main: lint+test+build gate, then image build with prod Vite
args, then compose pull/up of the web service on the VM with a health
check against https://kruxy.app. Closes the rest of #22.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: climbing-api CD workflow

**Files:**
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-api/.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: existing `Dockerfile` in climbing-api (multi-stage gradle build — the docker build itself compiles the jar; the separate gradle job exists to run tests, which the Dockerfile skips via `bootJar`).
- Produces: pushes `ghcr.io/585011/climbing-api:latest` + `:<sha>`; restarts compose service `api` (name must match Task 4). Health check: `https://kruxy.app/api/climbing-areas` (public GET) returns 200. Existing `gradle.yml` CI is left untouched.

- [ ] **Step 1: Create the branch**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-api
git checkout main && git pull
git checkout -b feature/39-cd-pipeline
```

- [ ] **Step 2: Write the workflow**

Create `/home/martin/Dokumenter/climbing-repo/climbing-api/.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - uses: gradle/actions/setup-gradle@v4
      - run: chmod +x ./gradlew
      - run: ./gradlew build

  build-push:
    needs: test
    if: github.repository_owner == '585011'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/585011/climbing-api:latest
            ghcr.io/585011/climbing-api:${{ github.sha }}

  deploy:
    needs: build-push
    if: github.repository_owner == '585011'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        env:
          SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_USER@$DEPLOY_HOST" \
            'cd /opt/climbing && docker compose pull api && docker compose up -d api'
      - name: Health check
        run: |
          for i in $(seq 1 24); do
            code=$(curl -s -o /dev/null -w '%{http_code}' "https://${{ vars.PROD_DOMAIN }}/api/climbing-areas") || code=000
            if [ "$code" = "200" ]; then echo "Healthy"; exit 0; fi
            echo "Attempt $i: HTTP $code — retrying in 5s"
            sleep 5
          done
          echo "Health check failed after 120s"
          exit 1
```

(24 attempts, not 12 — Spring Boot + Flyway startup is slower than Caddy.)

- [ ] **Step 3: Validate with actionlint**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-api
docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color
```

Expected: no output, exit 0 (same python fallback as Task 2 Step 2).

- [ ] **Step 4: Commit**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-api
git add .github/workflows/deploy.yml
git commit -m "$(cat <<'EOF'
Add CD workflow: gradle build, push image to GHCR, deploy via SSH

On push to main: full gradle build (tests included), image push with
latest + sha tags, compose pull/up of the api service on the Hetzner VM,
health check against https://kruxy.app/api/climbing-areas. Closes #39.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: climbing-deploy repo — compose stack + env template

**Files:**
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/docker-compose.yml`
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/.env.example`
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/.gitignore`

**Interfaces:**
- Consumes: `DOMAIN` env contract from Task 1; image names from Tasks 2–3.
- Produces: compose service names `web`, `api`, `postgres` (Tasks 2, 3, and 6's workflows depend on these exact names); volume names `postgres_data`, `caddy_data`, `caddy_config`; env var names listed in `.env.example` (Task 5's backup script sources the same `.env`).

- [ ] **Step 1: Initialize the repo**

```bash
mkdir -p /home/martin/Dokumenter/climbing-repo/climbing-deploy
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
git init -b main
```

- [ ] **Step 2: Write .gitignore**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/.gitignore`:

```
.env
backups/
```

- [ ] **Step 3: Write docker-compose.yml**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/docker-compose.yml`:

```yaml
services:
  web:
    image: ghcr.io/585011/climbing-web:latest
    container_name: climbing-web
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp" # HTTP/3
    environment:
      DOMAIN: ${DOMAIN:?set DOMAIN in .env}
    volumes:
      - caddy_data:/data     # Let's Encrypt certs — must survive redeploys
      - caddy_config:/config
    restart: unless-stopped
    depends_on:
      - api

  api:
    image: ghcr.io/585011/climbing-api:latest
    container_name: climbing-api
    environment:
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      SPRING_DATASOURCE_USERNAME: ${SPRING_DATASOURCE_USERNAME}
      SPRING_DATASOURCE_PASSWORD: ${SPRING_DATASOURCE_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      AUTH0_ISSUER_URI: ${AUTH0_ISSUER_URI}
      AUTH0_AUDIENCE: ${AUTH0_AUDIENCE}
      R2_ENDPOINT: ${R2_ENDPOINT}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET: ${R2_BUCKET}
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    container_name: climbing-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

Note: api and postgres publish **no host ports** — they are reachable only on the compose network, per the spec.

- [ ] **Step 4: Write .env.example**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/.env.example`:

```bash
# Copy to /opt/climbing/.env on the VM and fill in real values.
# This file is the ONLY place server-side secrets live — never commit .env.

# Caddy site address. The real domain enables automatic HTTPS.
# For a local smoke test of the stack, use DOMAIN=:80 (plain HTTP).
DOMAIN=kruxy.app

# Postgres (container init + healthcheck)
POSTGRES_DB=climbing
POSTGRES_USER=climbing
POSTGRES_PASSWORD=change-me

# Spring datasource (normally same credentials as above)
SPRING_DATASOURCE_USERNAME=climbing
SPRING_DATASOURCE_PASSWORD=change-me

# Auth0 (API side — issuer must end with a trailing slash)
AUTH0_ISSUER_URI=https://<tenant>.eu.auth0.com/
AUTH0_AUDIENCE=https://climbing-api

# Cloudflare R2 (wall image storage)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=change-me
R2_SECRET_ACCESS_KEY=change-me
R2_BUCKET=climbing-images
```

- [ ] **Step 5: Validate the compose file**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
cp .env.example .env
docker compose config --quiet && echo "compose config OK"
rm .env
```

Expected: `compose config OK` (interpolation + schema valid), then the test `.env` removed.

- [ ] **Step 6: Commit**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
git add .gitignore docker-compose.yml .env.example
git commit -m "$(cat <<'EOF'
Add production compose stack: web (Caddy edge), api, postgres

Web publishes 80/443 and holds the cert volume; api and postgres are
internal-only. All secrets come from an uncommitted .env.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: climbing-deploy — bootstrap and backup scripts

**Files:**
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/scripts/bootstrap.sh`
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/scripts/backup.sh`

**Interfaces:**
- Consumes: repo layout from Task 4 (`/opt/climbing` clone, `.env` with `POSTGRES_USER`/`POSTGRES_DB`, compose service `postgres`).
- Produces: a `deploy` user whose `~/.ssh/ci_deploy_key` private key becomes the `DEPLOY_SSH_KEY` GitHub secret; a manually invoked `scripts/backup.sh` writing `/opt/climbing/backups/climbing-YYYY-MM-DD.sql.gz`, 7-day retention of old dumps. No cron — backups run only when the operator triggers them.

- [ ] **Step 1: Write bootstrap.sh**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/scripts/bootstrap.sh`:

```bash
#!/usr/bin/env bash
# Bootstrap a fresh Ubuntu 24.04 Hetzner VM for the climbing stack.
# Idempotent — safe to re-run. Run as root:
#   bash <(curl -fsSL https://raw.githubusercontent.com/585011/climbing-deploy/main/scripts/bootstrap.sh)
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/climbing
REPO_URL=https://github.com/585011/climbing-deploy.git

# --- base packages ---
apt-get update
apt-get install -y ca-certificates curl git ufw

# --- Docker Engine + compose plugin (official Docker apt repo) ---
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# --- deploy user (CI SSHes in as this user; docker group = can run compose) ---
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

# --- dedicated SSH keypair for GitHub Actions deploys ---
DEPLOY_HOME=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
if [ ! -f "$DEPLOY_HOME/.ssh/ci_deploy_key" ]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" \
    -f "$DEPLOY_HOME/.ssh/ci_deploy_key"
  cat "$DEPLOY_HOME/.ssh/ci_deploy_key.pub" >> "$DEPLOY_HOME/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh/authorized_keys"
  chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
fi

# --- firewall: SSH + HTTP + HTTPS (TCP and UDP for HTTP/3) only ---
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# --- app directory ---
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/backups"

echo
echo "Bootstrap complete."
echo "1. Create $APP_DIR/.env from $APP_DIR/.env.example and fill in real values."
echo "2. Add this PRIVATE key as the DEPLOY_SSH_KEY GitHub secret (all three repos):"
echo
cat "$DEPLOY_HOME/.ssh/ci_deploy_key"
echo
echo "3. Then: cd $APP_DIR && docker compose up -d"
```

- [ ] **Step 2: Write backup.sh**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/scripts/backup.sh`:

```bash
#!/usr/bin/env bash
# Manual Postgres backup with 7-day rotation of old dumps.
# Run on the VM as the deploy user whenever a backup is wanted
# (especially before risky changes): /opt/climbing/scripts/backup.sh
set -euo pipefail

APP_DIR=/opt/climbing
BACKUP_DIR=$APP_DIR/backups
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
source .env
set +a

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/climbing-$(date +%F).sql.gz"

find "$BACKUP_DIR" -name 'climbing-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
```

- [ ] **Step 3: Validate both scripts**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
chmod +x scripts/bootstrap.sh scripts/backup.sh
bash -n scripts/bootstrap.sh && bash -n scripts/backup.sh && echo "syntax OK"
command -v shellcheck >/dev/null && shellcheck scripts/*.sh || echo "shellcheck not installed — skipped"
```

Expected: `syntax OK`; shellcheck clean (or skipped if not installed).

- [ ] **Step 4: Commit**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
git add scripts/
git commit -m "$(cat <<'EOF'
Add VM bootstrap and manual backup scripts

bootstrap.sh: idempotent server setup (Docker, deploy user + CI SSH key,
ufw, repo clone). backup.sh: manually triggered pg_dump to gzip with
7-day rotation of old dumps.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: climbing-deploy — runbook, config-apply workflow, publish to GitHub

**Files:**
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/README.md`
- Create: `/home/martin/Dokumenter/climbing-repo/climbing-deploy/.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: everything from Tasks 4–5; secret names from Global Constraints.
- Produces: public GitHub repo `585011/climbing-deploy`; the runbook other tasks' PR descriptions link to.

- [ ] **Step 1: Write README.md**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/README.md`:

```markdown
# climbing-deploy

Production deployment for the climbing app ([climbing-web](https://github.com/585011/climbing-web) + [climbing-api](https://github.com/585011/climbing-api)) on a single Hetzner VM at **https://kruxy.app**.

## Architecture

One docker compose stack, three services:

| Service | Image | Exposure |
|---|---|---|
| `web` | `ghcr.io/585011/climbing-web` (Caddy) | 80/443 — serves SPA, HTTPS, proxies `/api/*` → `api:8080` |
| `api` | `ghcr.io/585011/climbing-api` (Spring Boot) | internal only |
| `postgres` | `postgres:16` | internal only |

CD: pushes to `main` in climbing-web / climbing-api build + push an image to
GHCR, then SSH here and restart just their own service. Pushes to `main` in
this repo re-apply compose/config changes the same way.

## Initial setup (once)

1. **VM** — Hetzner Cloud → create server: CX22, Ubuntu 24.04, add your
   personal SSH key. Note the public IP.
2. **DNS** — A record for `kruxy.app` → the VM IP (plus AAAA if the VM has
   IPv6). Wait for it to resolve before first `up` (Let's Encrypt needs it).
3. **Bootstrap** — as root on the VM:
   `bash <(curl -fsSL https://raw.githubusercontent.com/585011/climbing-deploy/main/scripts/bootstrap.sh)`
   It installs Docker, creates the `deploy` user, configures ufw
   (22/80/443), clones this repo to `/opt/climbing`, and prints the CI
   deploy key.
4. **Secrets** — `cp /opt/climbing/.env.example /opt/climbing/.env` and fill
   in real values (as the `deploy` user).
5. **Auth0** — in the Auth0 application settings, add `https://kruxy.app`
   to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins.
6. **GitHub** — in *all three* repos add Actions secrets:
   `DEPLOY_HOST` (VM IP), `DEPLOY_USER` (`deploy`), `DEPLOY_SSH_KEY`
   (private key printed by bootstrap). In climbing-web and climbing-api add
   variable `PROD_DOMAIN=kruxy.app`. In climbing-web also add variables
   `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`.
7. **First start** — `cd /opt/climbing && docker compose up -d`, then check
   `https://kruxy.app`.

## Operations

**Deploy an app change** — push to `main` in the app repo; watch the Actions
run. Nothing to do here.

**Change deployment config** — edit files here, push to `main`; the workflow
SSHes in, `git pull`, `docker compose up -d`.

**Rollback an app** — every image is also tagged with its git SHA. Either
re-run the app repo's Deploy workflow from the last good commit
(`workflow_dispatch`), or on the VM pin the good tag manually:
`docker pull ghcr.io/585011/climbing-web:<good-sha> && docker tag ghcr.io/585011/climbing-web:<good-sha> ghcr.io/585011/climbing-web:latest && cd /opt/climbing && docker compose up -d web`
(same pattern with `climbing-api` / `api`).

**Backups** — manual, not scheduled. On the VM run
`/opt/climbing/scripts/backup.sh` (as the `deploy` user) to dump Postgres
to `/opt/climbing/backups/`; dumps older than 7 days are pruned on each
run. Take one before risky changes. **Restore:**
`gunzip -c backups/climbing-<date>.sql.gz | docker compose exec -T postgres psql -U <POSTGRES_USER> <POSTGRES_DB>`

**Rebuild a dead VM** — new VM → repeat steps 1–7 → restore latest backup →
DNS already points at the new IP after step 2. Recovery point = the last
manually taken dump (dumps live on the VM disk; off-site copies are a
tracked follow-up).

**Logs** — `cd /opt/climbing && docker compose logs -f --tail 100 api` (or
`web` / `postgres`).
```

- [ ] **Step 2: Write the config-apply workflow**

Create `/home/martin/Dokumenter/climbing-repo/climbing-deploy/.github/workflows/deploy.yml`:

```yaml
name: Apply config

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  apply:
    if: github.repository_owner == '585011'
    runs-on: ubuntu-latest
    steps:
      - name: SSH and apply compose config
        env:
          SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_USER@$DEPLOY_HOST" \
            'cd /opt/climbing && git pull --ff-only && docker compose up -d'
```

- [ ] **Step 3: Validate with actionlint**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color
```

Expected: no output, exit 0.

- [ ] **Step 4: Commit and publish the repo**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
git add README.md .github/
git commit -m "$(cat <<'EOF'
Add runbook and config-apply workflow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
gh repo create 585011/climbing-deploy --public --description "Production deployment (Hetzner VM, docker compose) for the climbing app" --source . --push
```

Expected: repo created and `main` pushed. Verify: `gh repo view 585011/climbing-deploy --json url -q .url` prints the URL.

---

### Task 7: Local end-to-end stack verification

**Files:** none created — verification only, using Tasks 1–6 output.

**Interfaces:**
- Consumes: local images built from the two app repos; compose stack from Task 4; the local `/home/martin/Dokumenter/climbing-repo/climbing-api/.env` (exists; holds dev Auth0/R2/Postgres values).

- [ ] **Step 1: Build both images locally under the prod image names**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
# Frontend needs Vite env values; take Auth0 from the local dev env file if
# present (check .env / .env.local), else use dummies (login won't work, the
# stack still boots — enough for proxy/header/DB verification).
ls .env .env.local 2>/dev/null || true
docker build -t ghcr.io/585011/climbing-web:latest \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_AUTH0_DOMAIN="$(grep -h '^VITE_AUTH0_DOMAIN=' .env .env.local 2>/dev/null | head -1 | cut -d= -f2)" \
  --build-arg VITE_AUTH0_CLIENT_ID="$(grep -h '^VITE_AUTH0_CLIENT_ID=' .env .env.local 2>/dev/null | head -1 | cut -d= -f2)" \
  --build-arg VITE_AUTH0_AUDIENCE="$(grep -h '^VITE_AUTH0_AUDIENCE=' .env .env.local 2>/dev/null | head -1 | cut -d= -f2)" .

docker build -t ghcr.io/585011/climbing-api:latest /home/martin/Dokumenter/climbing-repo/climbing-api
```

Expected: both builds succeed (the api build runs gradle — takes a few minutes).

- [ ] **Step 2: Assemble a local test .env and start the stack**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
cp /home/martin/Dokumenter/climbing-repo/climbing-api/.env .env
echo 'DOMAIN=:80' >> .env
# Port 80 must be free locally:
ss -ltn 'sport = :80' | grep -q LISTEN && echo "PORT 80 BUSY — stop the conflicting service first" || echo "port 80 free"
docker compose up -d
```

Expected: `port 80 free`; three containers start. If the api repo's `.env` lacks `POSTGRES_USER`, add `POSTGRES_USER=<value of SPRING_DATASOURCE_USERNAME>` the same way.

- [ ] **Step 3: Wait for the api, then verify the full chain**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/climbing-areas) || code=000
  [ "$code" = "200" ] && break
  sleep 3
done
echo "--- api through Caddy proxy: $code (want 200) ---"
curl -s -o /dev/null -w 'SPA route /areas/1: %{http_code} %{content_type}\n' http://localhost/areas/1
curl -sI http://localhost/ | grep -ci -E 'content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy'
docker compose logs api 2>&1 | grep -c "Flyway" || true
```

Expected: api returns `200` through the proxy; SPA route `200 text/html`; header grep counts `5`; Flyway lines present in api logs (migrations ran).

- [ ] **Step 4: Tear down and clean up**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-deploy
docker compose down -v
rm .env
```

Expected: containers and test volumes removed; the gitignored test `.env` deleted. **Report any check that failed instead of proceeding.**

---

### Task 8: Open PRs and hand off manual steps

**Files:** none — PR creation and final report.

**Interfaces:**
- Consumes: branches `feature/22-caddy-deploy` (climbing-web, includes the spec/plan docs commits) and `feature/39-cd-pipeline` (climbing-api); published `climbing-deploy` repo.

- [ ] **Step 1: Push branches and open both PRs**

```bash
cd /home/martin/Dokumenter/climbing-repo/climbing-web
git -c credential.helper='!gh auth git-credential' push -u origin feature/22-caddy-deploy
gh pr create --title "Caddy production image + CD pipeline" --body "$(cat <<'EOF'
Closes #22.

- Replaces nginx with Caddy in the production image: SPA serving, automatic HTTPS via the `DOMAIN` env var, `/api/*` reverse proxy, all security headers ported from nginx.conf, zstd/gzip compression
- Adds `.github/workflows/deploy.yml`: lint+test+build → GHCR push (`latest` + sha) → SSH deploy to the Hetzner VM → health check
- Includes the approved design spec and implementation plan under `docs/superpowers/`

Deployment config lives in https://github.com/585011/climbing-deploy — see its README for the one-time VM/DNS/secrets setup.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

cd /home/martin/Dokumenter/climbing-repo/climbing-api
git -c credential.helper='!gh auth git-credential' push -u origin feature/39-cd-pipeline
gh pr create --title "CD pipeline: GHCR image + SSH deploy to Hetzner" --body "$(cat <<'EOF'
Closes #39.

- Adds `.github/workflows/deploy.yml`: gradle build (tests) → GHCR push (`latest` + sha) → SSH deploy of the `api` compose service → health check against `/api/climbing-areas`
- Existing `gradle.yml` CI is unchanged

Deployment config lives in https://github.com/585011/climbing-deploy — see its README for the one-time VM/DNS/secrets setup.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: two PR URLs printed.

- [ ] **Step 2: Report the manual go-live checklist**

Final message to the user must list, in order, the manual steps only they can do (with links): create the CX22 VM, point `kruxy.app` DNS at it, run `bootstrap.sh`, fill `/opt/climbing/.env`, add `https://kruxy.app` to the Auth0 app URLs, set the GitHub secrets/variables in all three repos (exact names from Global Constraints), merge the two PRs, watch the two Deploy runs go green, and smoke-test `https://kruxy.app` (login, browse, image upload, tick). Point at the climbing-deploy README as the durable runbook.

---

## Self-Review Notes

- **Spec coverage:** Caddyfile/headers/compression (T1), web CD (T2), api CD (T3), compose stack + env split (T4), bootstrap/ufw/deploy-user/backups (T5), runbook + config-apply workflow + repo publish (T6), local full-stack test from the spec's testing strategy (T7), rollback documentation (T6 README) — all spec sections have a task. VM creation/DNS/Auth0/secrets are user-manual by design → T8 checklist.
- **Type/name consistency:** compose service names `web`/`api`/`postgres` used identically in T2/T3/T4/T6; secret/variable names identical across T2/T3/T6/T8; `DOMAIN` contract identical in T1/T4/T7; image names identical in T2/T3/T4/T7.
- **Placeholders:** `.env.example` `change-me`/`<tenant>` values are intentional user-supplied secrets, not plan gaps.

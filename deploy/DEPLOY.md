# ROVE Hire — Production deploy cheat sheet

**Default workflow:** build on Mac → push to GHCR → pull on Pi.  
Do **not** build on the Raspberry Pi unless you have to.

Full Pi/nginx troubleshooting: [MANUAL_DEPLOY.md](./MANUAL_DEPLOY.md)

---

## Every deploy (after code changes)

```bash
pnpm docker:push        # Mac: build linux/arm64 images → ghcr.io/karnavpargi/*
pnpm deploy:registry    # Pi:  pull images, migrate, restart (no source sync)
```

Config lives in `deploy/deploy.env` (gitignored). Template: `deploy/deploy.env.example`.

| Command                | What it does                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm docker:push`     | Runs `deploy/docker-build-push.sh` — builds `api`, `web`, `db-setup`, pushes to registry   |
| `pnpm deploy:registry` | Runs `deploy/deploy-registry.sh` — SSH to Pi, `docker compose pull`, migrate/seed, `up -d` |
| `pnpm deploy`          | **Legacy:** rsync full source to Pi and build there (slow on Pi)                           |
| `pnpm deploy:help`     | Print this file                                                                            |

---

## One-time setup

### 1. Create `deploy/deploy.env`

```bash
cp deploy/deploy.env.example deploy/deploy.env
# Edit secrets: POSTGRES_PASSWORD, JWT_SECRET, AWS keys, APP_URL
```

Registry block (already in example):

```bash
DOCKER_REGISTRY=ghcr.io/karnavpargi
IMAGE_TAG=latest
DOCKER_PLATFORM=linux/arm64
API_IMAGE=${DOCKER_REGISTRY}/rove-hire-api:${IMAGE_TAG}
WEB_IMAGE=${DOCKER_REGISTRY}/rove-hire-web:${IMAGE_TAG}
DB_SETUP_IMAGE=${DOCKER_REGISTRY}/rove-hire-db-setup:${IMAGE_TAG}
DOCKER_REGISTRY_USER=karnavpargi
```

### 2. GHCR auth on your Mac (required for push)

Your GitHub token needs **`write:packages`** and **`read:packages`**. Without this, push fails with:

`permission_denied: The token provided does not match expected scopes`

```bash
# One-time (opens browser)
gh auth refresh -h github.com -s write:packages,read:packages

# Before each push session (or add DOCKER_REGISTRY_TOKEN to deploy.env)
echo "$(gh auth token)" | docker login ghcr.io -u karnavpargi --password-stdin
```

### 3. Pi pull access (private packages)

Either **make packages public** (GitHub → Packages → settings → Change visibility),  
or add to `deploy/deploy.env`:

```bash
DOCKER_REGISTRY_TOKEN=ghp_...   # PAT with read:packages
DOCKER_REGISTRY_USER=karnavpargi
```

`deploy-registry.sh` runs `docker login` on the Pi when `DOCKER_REGISTRY_TOKEN` is set.

### 4. First deploy to a new server

```bash
# On Pi (once): Docker + directory
ssh root@192.168.10.4 'bash -s' < deploy/bootstrap-server.sh

pnpm docker:push
pnpm deploy:registry
```

Add nginx includes to your existing `rove.kpargi.eu.org` HTTPS block (once):

```nginx
include /etc/nginx/snippets/rove-hire-upstreams.conf;
include /etc/nginx/snippets/rove-hire-locations.conf;
```

Then `sudo nginx -t && sudo systemctl reload nginx`.

---

## Verify

| Check  | URL                                                       |
| ------ | --------------------------------------------------------- |
| Health | https://rove.kpargi.eu.org/api/health → `{"status":"ok"}` |
| App    | https://rove.kpargi.eu.org/login                          |
| Login  | `hr@rove.com` / `RoveHire2024!`                           |

On the Pi:

```bash
curl -s http://127.0.0.1:13000/api/health
docker compose -f docker-compose.registry.yml ps
```

---

## Images pushed

| Image                                           | Purpose                                                     |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `ghcr.io/karnavpargi/rove-hire-api:latest`      | NestJS API (production stage)                               |
| `ghcr.io/karnavpargi/rove-hire-web:latest`      | Next.js frontend (`NEXT_PUBLIC_GRAPHQL_URL` baked at build) |
| `ghcr.io/karnavpargi/rove-hire-db-setup:latest` | One-off migrate + seed                                      |

`NEXT_PUBLIC_GRAPHQL_URL` is set from `APP_URL` during `pnpm docker:push`. If you change the public URL, rebuild and push the **web** image.

---

## Troubleshooting

| Problem                               | Fix                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Push denied (token scopes)            | `gh auth refresh -h github.com -s write:packages,read:packages` then re-login to ghcr.io           |
| Pi cannot pull                        | Set `DOCKER_REGISTRY_TOKEN` or make GHCR packages public                                           |
| Login works locally but not via HTTPS | `APP_URL` must match exactly; nginx must send `X-Forwarded-Proto: https`; `COOKIE_SECURE=true`     |
| Wrong GraphQL URL in browser          | Re-run `pnpm docker:push` (web image embeds `APP_URL/graphql`)                                     |
| Mac cannot SSH to Pi                  | See [MANUAL_DEPLOY.md § Part 0](./MANUAL_DEPLOY.md#part-0--fix-network-if-mac-cannot-reach-the-pi) |

---

## File map

```
docker-compose.registry.yml   # Pi: pull pre-built images (no build:)
docker-compose.prod.yml       # Legacy: build on Pi
deploy/docker-build-push.sh   # Mac: build + push
deploy/deploy-registry.sh     # Mac → Pi: pull + start
deploy/deploy.env             # Secrets + registry (gitignored)
```

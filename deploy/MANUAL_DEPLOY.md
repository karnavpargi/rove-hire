# ROVE Hire — Manual deployment (DietPi / Raspberry Pi)

Use this when automated `pnpm deploy` or SSH from your Mac fails (e.g. `No route to host`).

**Quick reference:** [`DEPLOY.md`](./DEPLOY.md) · `pnpm deploy:help`  
**Recommended (faster on Pi):** registry deploy — build on Mac, push, pull on Pi (see [Registry deploy](#registry-deploy-build-on-mac-push-pull-on-pi) or `DEPLOY.md`).

**Target**

| Item            | Value                                   |
| --------------- | --------------------------------------- |
| Install path    | `/home/dietpi/rove-hire`                |
| Public URL      | `https://rove.kpargi.eu.org`            |
| API (localhost) | `127.0.0.1:13000`                       |
| Web (localhost) | `127.0.0.1:13001`                       |
| Health (public) | `https://rove.kpargi.eu.org/api/health` |

---

## Part 0 — Fix network (if Mac cannot reach the Pi)

`No route to host` means your Mac never reaches the Pi — not an SSH key issue.

On the **Pi** (keyboard + monitor, or local terminal):

```bash
hostname -I          # note the IP (may not be 192.168.10.4 anymore)
ip route
systemctl status ssh
```

On your **Mac**:

```bash
# Replace with the IP from hostname -I
ping -c 3 192.168.10.4
nc -zv 192.168.10.4 22
```

Fix until `ping` works:

- Same Wi‑Fi / VLAN (avoid guest network isolation)
- Reserve DHCP IP in router or set static IP on Pi
- Enable SSH: `sudo systemctl enable --now ssh`
- Update `deploy/deploy.env` `DEPLOY_HOST` if IP changed

---

## Registry deploy (build on Mac, push, pull on Pi)

Avoids 10–20 minute on-server builds on the Raspberry Pi.

### 1 — Configure registry in `deploy/deploy.env`

Add (example for GitHub Container Registry):

```bash
DOCKER_REGISTRY=ghcr.io/YOUR_GITHUB_USERNAME
IMAGE_TAG=latest
DOCKER_PLATFORM=linux/arm64

API_IMAGE=${DOCKER_REGISTRY}/rove-hire-api:${IMAGE_TAG}
WEB_IMAGE=${DOCKER_REGISTRY}/rove-hire-web:${IMAGE_TAG}
DB_SETUP_IMAGE=${DOCKER_REGISTRY}/rove-hire-db-setup:${IMAGE_TAG}

# Private registry only:
# DOCKER_REGISTRY_USER=YOUR_GITHUB_USERNAME
# DOCKER_REGISTRY_TOKEN=ghp_...   # PAT with read:packages + write:packages
```

On your Mac, log in once (or use `DOCKER_REGISTRY_TOKEN` in `deploy.env`):

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Make GHCR packages public (package settings → Change visibility) **or** set `DOCKER_REGISTRY_TOKEN` so the Pi can `docker pull`.

### 2 — Build and push from your Mac

```bash
cd /path/to/rove-hire
pnpm docker:push
```

This builds `api`, `web`, and `db-setup` for `linux/arm64` and pushes to your registry.

### 3 — Deploy to the Pi (pull only, no source sync)

```bash
pnpm deploy:registry
```

This copies only `docker-compose.registry.yml`, nginx snippets, and `deploy.env` — then `docker compose pull`, migrate/seed, and `up -d`.

### 4 — Updates

After code changes:

```bash
pnpm docker:push          # rebuild + push new images (bump IMAGE_TAG if you version)
pnpm deploy:registry      # pull + restart on Pi
```

---

## Part 1 — Get the code onto the Pi

Pick **one** method.

### A) Git clone on the Pi (easiest if repo is on GitHub)

```bash
sudo mkdir -p /home/dietpi/rove-hire
sudo chown -R dietpi:dietpi /home/dietpi/rove-hire
cd /home/dietpi
git clone <YOUR_REPO_URL> rove-hire
cd rove-hire
```

### B) Copy from Mac when SSH works

```bash
rsync -avz --exclude node_modules --exclude .git \
  -e "ssh -i ~/.ssh/rpi_Server_key.pem" \
  /Users/karnavpargi/Code/2026/markitdown/excercise/ \
  root@192.168.10.4:/home/dietpi/rove-hire/
ssh -i ~/.ssh/rpi_Server_key.pem root@192.168.10.4 \
  "chown -R dietpi:dietpi /home/dietpi/rove-hire"
```

### C) USB / zip

Zip the project on Mac (exclude `node_modules`, `.next`, `dist`), copy to Pi, unzip to `/home/dietpi/rove-hire`.

---

## Part 2 — Install Docker on the Pi

Run on the Pi as **root**:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
docker compose version
```

Optional: allow `dietpi` to run Docker:

```bash
usermod -aG docker dietpi
```

---

## Part 3 — Production environment file

On the Pi:

```bash
cd /home/dietpi/rove-hire
mkdir -p deploy data/postgres
cp deploy/deploy.env.example deploy/deploy.env
nano deploy/deploy.env
```

Set at minimum:

```bash
APP_URL=https://rove.kpargi.eu.org
POSTGRES_PASSWORD=<strong-random>
JWT_SECRET=<long-random>
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=shadowhogdatabook-dev
COOKIE_SECURE=true
ENABLE_HSTS=true
```

Load env for every command below:

```bash
cd /home/dietpi/rove-hire
set -a && source deploy/deploy.env && set +a
```

---

## Part 4 — Database migrate + seed

```bash
cd /home/dietpi/rove-hire
set -a && source deploy/deploy.env && set +a

docker compose -f docker-compose.prod.yml --profile setup run --rm db-setup
```

This runs Prisma migrations and seed (HR user `hr@rove.com` / `RoveHire2024!`).

---

## Part 5 — Build and start containers

First build takes 10–20 minutes on a Pi:

```bash
cd /home/dietpi/rove-hire
set -a && source deploy/deploy.env && set +a

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Verify on the Pi:

```bash
curl -s http://127.0.0.1:13000/api/health   # → {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:13001/   # → 200
```

---

## Part 6 — Host nginx (existing server)

Do **not** run a second nginx in Docker. Install snippets only:

```bash
cd /home/dietpi/rove-hire
set -a && source deploy/deploy.env && set +a
bash deploy/install-nginx-site.sh
```

Then edit your **existing** `rove.kpargi.eu.org` HTTPS server block (often under `/etc/nginx/sites-available/`):

```nginx
# At http { } level OR top of server block — upstreams once per nginx.conf:
include /etc/nginx/snippets/rove-hire-upstreams.conf;

server {
  listen 443 ssl;
  server_name rove.kpargi.eu.org;
  # ... your existing ssl_certificate lines ...

  client_max_body_size 15m;

  include /etc/nginx/snippets/rove-hire-locations.conf;
}
```

**Important:** If another app already uses `location /` on this subdomain, you must split by path or use a dedicated subdomain only for ROVE Hire. The snippet sends `/` to the ROVE web app.

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Part 7 — Public checks

From any browser or machine with internet:

| URL                                   | Expected            |
| ------------------------------------- | ------------------- |
| https://rove.kpargi.eu.org/api/health | `{"status":"ok"}`   |
| https://rove.kpargi.eu.org/login      | Login page          |
| https://rove.kpargi.eu.org/graphql    | GraphQL (POST only) |

Login: `hr@rove.com` / `RoveHire2024!`

---

## Part 8 — Updates (redeploy)

On the Pi after pulling new code:

```bash
cd /home/dietpi/rove-hire
git pull   # or rsync again
set -a && source deploy/deploy.env && set +a
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

### `pnpm install` fails on Puppeteer (ARM / DietPi)

Puppeteer’s postinstall tries to download Chrome. On ARM Linux that often fails or leaves a broken cache. ROVE Hire uses **system Chromium** (in Docker or on the host), not Puppeteer’s bundled browser.

**If you only deploy with Docker** (recommended): you do **not** need `pnpm install` on the Pi host — skip to Part 4 and use `docker compose ... up -d --build`.

**If you must install on the host** (e.g. local dev on the Pi):

```bash
# Remove broken partial download
rm -rf /root/.cache/puppeteer ~/.cache/puppeteer

cd /home/dietpi/rove-hire
PUPPETEER_SKIP_DOWNLOAD=true pnpm install

# Install system Chromium and point Puppeteer at it
sudo apt-get update && sudo apt-get install -y chromium
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium   # or /usr/bin/chromium-browser
```

After pulling the latest code, `apps/api/package.json` sets `"puppeteer": { "skipDownload": true }`, so a plain `pnpm install` should work without the env var.

### `docker compose` fails on build (out of memory)

```bash
# Add swap on Pi
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile   # CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### API container unhealthy

```bash
docker logs rove-hire-api --tail 100
docker logs rove-hire-db --tail 50
```

### Login works locally but not via HTTPS

- `FRONTEND_URL` in `deploy/deploy.env` must be exactly `https://rove.kpargi.eu.org`
- Edge proxy must send `X-Forwarded-Proto: https`
- `COOKIE_SECURE=true` requires HTTPS in the browser

### Port already in use

Change in `deploy/deploy.env`:

```bash
API_HOST_PORT=13002
WEB_HOST_PORT=13003
```

Re-run compose and regenerate nginx snippets (`bash deploy/install-nginx-site.sh`).

### View logs

```bash
docker compose -f docker-compose.prod.yml logs -f api web
```

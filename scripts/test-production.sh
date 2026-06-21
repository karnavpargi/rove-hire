#!/usr/bin/env bash
# =============================================================================
# ROVE Hire — Production deployment smoke test
#
# Validates Docker Compose production stack: build, migrate, seed, health, login.
# Uses production port/URL defaults so a dev-oriented .env cannot bind conflicting ports.
#
# Usage: pnpm docker:test
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

# Load .env for secrets (Postgres, JWT, AWS) then force production test ports/URLs.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  warn ".env missing — copying from .env.example"
  cp .env.example .env
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export API_PORT=3000
export WEB_PORT=3001
export NODE_ENV=production
export FRONTEND_URL=http://localhost:3001
export NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/graphql
export COOKIE_SECURE=false
export ENABLE_HSTS=false

echo "=== ROVE Hire production deployment test ==="
echo "API:  http://localhost:${API_PORT}"
echo "Web:  http://localhost:${WEB_PORT}"
echo ""

# ---------------------------------------------------------------------------
# 1. Preconditions
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  fail "docker CLI not found — install Docker Desktop"
fi

if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon not running — open Docker Desktop and wait until it is ready"
fi

if [[ "${API_PORT}" == "${WEB_PORT}" ]]; then
  fail "API_PORT and WEB_PORT both set to ${API_PORT} — they must differ (use 3000 and 3001)"
fi

pass "Docker daemon reachable"
pass "Port config OK (API=${API_PORT}, WEB=${WEB_PORT})"

# ---------------------------------------------------------------------------
# 2. Build and start stack
# ---------------------------------------------------------------------------
echo ""
echo "--- Stopping any existing stack ---"
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "--- Database setup (migrate + seed) ---"
docker compose --profile setup run --rm db-setup

echo ""
echo "--- Building and starting production containers ---"
docker compose up -d --build

# ---------------------------------------------------------------------------
# 3. Wait for services
# ---------------------------------------------------------------------------
wait_for_url() {
  local name="$1"
  local url="$2"
  local max_attempts="${3:-60}"
  local attempt=1

  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    if curl -sf "${url}" >/dev/null 2>&1; then
      pass "${name} ready (${url})"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  fail "${name} did not become ready at ${url} within $((max_attempts * 2))s"
}

echo ""
echo "--- Waiting for services ---"
wait_for_url "API health" "http://localhost:${API_PORT}/api/health" 90
wait_for_url "Web frontend" "http://localhost:${WEB_PORT}/" 60

# ---------------------------------------------------------------------------
# 4. Smoke checks
# ---------------------------------------------------------------------------
echo ""
echo "--- Smoke checks ---"

HEALTH_BODY="$(curl -sf "http://localhost:${API_PORT}/api/health")"
if echo "${HEALTH_BODY}" | grep -q '"status":"ok"'; then
  pass "API health returns ok"
else
  fail "API health unexpected response: ${HEALTH_BODY}"
fi

WEB_STATUS="$(curl -sf -o /dev/null -w '%{http_code}' "http://localhost:${WEB_PORT}/login")"
if [[ "${WEB_STATUS}" == "200" ]]; then
  pass "Web /login returns 200"
else
  fail "Web /login returned HTTP ${WEB_STATUS}"
fi

LOGIN_RESPONSE="$(curl -sf -X POST "http://localhost:${API_PORT}/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { login(email: \"hr@rove.com\", password: \"RoveHire2024!\") { user { email } } }"}')"

if echo "${LOGIN_RESPONSE}" | grep -q 'hr@rove.com'; then
  pass "GraphQL login mutation succeeds (seed HR user)"
else
  fail "GraphQL login failed: ${LOGIN_RESPONSE}"
fi

# ---------------------------------------------------------------------------
# 5. Container health
# ---------------------------------------------------------------------------
echo ""
echo "--- Container status ---"
docker compose ps

echo ""
echo -e "${GREEN}=== Production deployment test passed ===${NC}"
echo ""
echo "Next steps for public access:"
echo "  cloudflared tunnel --url http://localhost:${WEB_PORT}"
echo "  Then set FRONTEND_URL, NEXT_PUBLIC_GRAPHQL_URL, COOKIE_SECURE=true, ENABLE_HSTS=true and rebuild."

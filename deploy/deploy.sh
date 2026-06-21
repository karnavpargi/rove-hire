#!/usr/bin/env bash
# Sync project to DEPLOY_HOST and start the production Docker stack.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG:-$ROOT_DIR/deploy/deploy.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE"
  echo "Copy deploy/deploy.env.example to deploy/deploy.env and set secrets."
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${APP_URL:?APP_URL is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${API_HOST_PORT:?API_HOST_PORT is required}"
: "${WEB_HOST_PORT:?WEB_HOST_PORT is required}"

DEPLOY_USER="${DEPLOY_USER:-dietpi}"
COMPOSE_FILE="docker-compose.prod.yml"
REMOTE="${DEPLOY_HOST}:${DEPLOY_PATH}"

# Load user shell env (sshpass path, SSHPASS, etc.)
# shellcheck disable=SC1090
[[ -f "${HOME}/.zshrc" ]] && source "${HOME}/.zshrc" 2>/dev/null || true
# shellcheck disable=SC1090
[[ -f "${HOME}/.bashrc" ]] && source "${HOME}/.bashrc" 2>/dev/null || true

USE_SSHPASS=false
if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  USE_SSHPASS=true
fi

SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE:-}"
if [[ -n "$SSH_IDENTITY_FILE" ]]; then
  SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE/#\~/$HOME}"
fi
USE_SSH_KEY=false
if [[ -n "$SSH_IDENTITY_FILE" && -f "$SSH_IDENTITY_FILE" ]]; then
  USE_SSH_KEY=true
  USE_SSHPASS=false
fi

# Reuse one SSH connection so you only authenticate once.
SSH_CONTROL_PATH="${TMPDIR:-/tmp}/rove-hire-ssh-%r@%h:%p"
SSH_OPTS=(
  -o ControlMaster=auto
  -o ControlPath="${SSH_CONTROL_PATH}"
  -o ControlPersist=600
  -o StrictHostKeyChecking=accept-new
)
if [[ "$USE_SSH_KEY" == "true" ]]; then
  SSH_OPTS+=(-i "$SSH_IDENTITY_FILE" -o IdentitiesOnly=yes)
fi

run_ssh() {
  if [[ "$USE_SSHPASS" == "true" ]]; then
    sshpass -e ssh "${SSH_OPTS[@]}" "$@"
  else
    ssh "${SSH_OPTS[@]}" "$@"
  fi
}

run_scp() {
  if [[ "$USE_SSHPASS" == "true" ]]; then
    sshpass -e scp "${SSH_OPTS[@]}" "$@"
  else
    scp "${SSH_OPTS[@]}" "$@"
  fi
}

if [[ "$USE_SSHPASS" == "true" ]]; then
  RSYNC_SSH="sshpass -e ssh ${SSH_OPTS[*]}"
else
  RSYNC_SSH="ssh ${SSH_OPTS[*]}"
fi

cleanup_ssh() {
  run_ssh -O exit "$DEPLOY_HOST" 2>/dev/null || true
}
trap cleanup_ssh EXIT

if [[ "$USE_SSH_KEY" == "true" ]]; then
  echo "→ Using SSH key ${SSH_IDENTITY_FILE} for ${DEPLOY_HOST}"
elif [[ "$USE_SSHPASS" == "true" ]]; then
  echo "→ Using sshpass (SSHPASS env) for ${DEPLOY_HOST}"
else
  echo "→ SSH will prompt for the password to ${DEPLOY_HOST} (enter it once)"
fi
echo "→ Ensuring remote directory ${DEPLOY_PATH}"
run_ssh "$DEPLOY_HOST" "mkdir -p '${DEPLOY_PATH}/data/postgres' && chown -R '${DEPLOY_USER}:${DEPLOY_USER}' '${DEPLOY_PATH}'"

echo "→ Syncing application files to ${DEPLOY_PATH}"
rsync -az --delete -e "$RSYNC_SSH" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.turbo' \
  --exclude 'apps/web/.next' \
  --exclude 'apps/api/dist' \
  --exclude 'packages/shared/dist' \
  --exclude 'coverage' \
  --exclude 'graphify-out' \
  --exclude 'raw' \
  --exclude '.agent' \
  --exclude '.kiro' \
  --exclude 'data/postgres' \
  --exclude 'deploy/deploy.env' \
  --exclude 'deploy/nginx/rove-host.generated.conf' \
  "$ROOT_DIR/" "$REMOTE/"

echo "→ Uploading production environment"
run_ssh "$DEPLOY_HOST" "mkdir -p '${DEPLOY_PATH}/deploy'"
run_scp "$CONFIG_FILE" "${REMOTE}/deploy/deploy.env"

REMOTE_ENV="set -a && source '${DEPLOY_PATH}/deploy/deploy.env' && set +a"

echo "→ Running database migrations and seed (idempotent)"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' --profile setup run --rm db-setup"

echo "→ Building and starting containers (localhost:${API_HOST_PORT} api, localhost:${WEB_HOST_PORT} web)"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' up -d --build"

echo "→ Installing host nginx site (does not replace other apps on the server)"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && bash deploy/install-nginx-site.sh"

echo "→ Deployment complete"
echo "   Install path: ${DEPLOY_PATH}"
echo "   App:          ${APP_URL}"
echo "   GraphQL:      ${APP_URL}/graphql"
echo "   Health:       ${APP_URL}/api/health"
echo "   Login:        ${APP_URL}/login (hr@rove.com / RoveHire2024!)"
echo ""
if [[ "${NGINX_USE_EXISTING_SERVER:-true}" == "true" ]]; then
  echo "   Host nginx: add these includes to your existing rove.kpargi.eu.org server block, then reload nginx:"
  echo "     include /etc/nginx/snippets/rove-hire-upstreams.conf;"
  echo "     include /etc/nginx/snippets/rove-hire-locations.conf;"
else
  echo "   Host nginx: standalone site installed in sites-available/${NGINX_SITE_NAME:-rove-hire}.conf"
fi

#!/usr/bin/env bash
# Pull pre-built images on DEPLOY_HOST and start the production stack (no on-server build).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG:-$ROOT_DIR/deploy/deploy.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE"
  echo "Copy deploy/deploy.env.example to deploy/deploy.env and set secrets + image names."
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
: "${DOCKER_REGISTRY:?DOCKER_REGISTRY is required}"
: "${API_IMAGE:?API_IMAGE is required}"
: "${WEB_IMAGE:?WEB_IMAGE is required}"
: "${DB_SETUP_IMAGE:?DB_SETUP_IMAGE is required}"

DEPLOY_USER="${DEPLOY_USER:-dietpi}"
COMPOSE_FILE="docker-compose.registry.yml"
REMOTE="${DEPLOY_HOST}:${DEPLOY_PATH}"

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

echo "→ Ensuring remote directory ${DEPLOY_PATH}"
run_ssh "$DEPLOY_HOST" "mkdir -p '${DEPLOY_PATH}/data/postgres' '${DEPLOY_PATH}/deploy/nginx' && chown -R '${DEPLOY_USER}:${DEPLOY_USER}' '${DEPLOY_PATH}'"

echo "→ Syncing compose + deploy config (no application source)"
run_scp "$ROOT_DIR/docker-compose.registry.yml" "${REMOTE}/"
run_scp "$ROOT_DIR/deploy/install-nginx-site.sh" "${REMOTE}/deploy/"
rsync -az -e "$RSYNC_SSH" \
  "$ROOT_DIR/deploy/nginx/" \
  "${REMOTE}/deploy/nginx/"

echo "→ Uploading production environment"
run_scp "$CONFIG_FILE" "${REMOTE}/deploy/deploy.env"

REMOTE_ENV="set -a && source '${DEPLOY_PATH}/deploy/deploy.env' && set +a"

echo "→ Logging into registry on server (if DOCKER_REGISTRY_TOKEN is set)"
if [[ -n "${DOCKER_REGISTRY_TOKEN:-}" ]]; then
  REGISTRY_HOST="${DOCKER_REGISTRY%%/*}"
  run_ssh "$DEPLOY_HOST" "echo '${DOCKER_REGISTRY_TOKEN}' | docker login '${REGISTRY_HOST}' -u '${DOCKER_REGISTRY_USER:-}' --password-stdin"
fi

echo "→ Pulling images"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' pull"

echo "→ Running database migrations and seed (idempotent)"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' --profile setup run --rm db-setup"

echo "→ Starting containers (localhost:${API_HOST_PORT} api, localhost:${WEB_HOST_PORT} web)"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && docker compose -f '${COMPOSE_FILE}' up -d"

echo "→ Installing host nginx snippets"
run_ssh "$DEPLOY_HOST" "${REMOTE_ENV} && cd '${DEPLOY_PATH}' && bash deploy/install-nginx-site.sh"

echo "→ Registry deployment complete"
echo "   Install path: ${DEPLOY_PATH}"
echo "   App:          ${APP_URL}"
echo "   GraphQL:      ${APP_URL}/graphql"
echo "   Health:       ${APP_URL}/api/health"
echo "   Images:"
echo "     API:      ${API_IMAGE}"
echo "     Web:      ${WEB_IMAGE}"
echo "     DB setup: ${DB_SETUP_IMAGE}"

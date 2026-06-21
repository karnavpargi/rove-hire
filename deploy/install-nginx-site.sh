#!/usr/bin/env bash
# Install host nginx config for ROVE Hire (run on the server).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/deploy/deploy.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${API_HOST_PORT:?API_HOST_PORT is required}"
: "${WEB_HOST_PORT:?WEB_HOST_PORT is required}"
: "${NGINX_SITE_NAME:=rove-hire}"
: "${NGINX_SNIPPETS_DIR:=/etc/nginx/snippets}"
: "${NGINX_SITES_AVAILABLE:=/etc/nginx/sites-available}"
: "${NGINX_SITES_ENABLED:=/etc/nginx/sites-enabled}"
: "${NGINX_USE_EXISTING_SERVER:=true}"

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is not installed on this host."
  exit 1
fi

export API_HOST_PORT WEB_HOST_PORT

UPSTREAMS_TEMPLATE="${PROJECT_DIR}/deploy/nginx/rove-upstreams.conf.template"
LOCATIONS_TEMPLATE="${PROJECT_DIR}/deploy/nginx/rove-locations.conf.template"
UPSTREAMS_TARGET="${NGINX_SNIPPETS_DIR}/rove-hire-upstreams.conf"
LOCATIONS_TARGET="${NGINX_SNIPPETS_DIR}/rove-hire-locations.conf"

mkdir -p "${NGINX_SNIPPETS_DIR}"

echo "→ Installing nginx snippets"
envsubst '${API_HOST_PORT} ${WEB_HOST_PORT}' < "$UPSTREAMS_TEMPLATE" > "$UPSTREAMS_TARGET"
cp "$LOCATIONS_TEMPLATE" "$LOCATIONS_TARGET"

if [[ "${NGINX_USE_EXISTING_SERVER}" == "true" ]]; then
  echo "→ NGINX_USE_EXISTING_SERVER=true — snippets only (no new server block)"
  echo ""
  echo "  Add these lines to your existing rove.kpargi.eu.org server block:"
  echo "    include ${UPSTREAMS_TARGET};"
  echo "    include ${LOCATIONS_TARGET};"
  echo ""
  echo "  Skip the upstream include if you already define rove_hire_* upstreams."
else
  SITE_TEMPLATE="${PROJECT_DIR}/deploy/nginx/rove-host.conf.template"
  SITE_TARGET="${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}.conf"
  cp "$SITE_TEMPLATE" "$SITE_TARGET"
  ln -sf "${SITE_TARGET}" "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}.conf"
  echo "→ Installed standalone site: ${SITE_TARGET}"
fi

echo "→ Testing nginx configuration"
nginx -t

echo "→ Reloading nginx"
if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx
else
  nginx -s reload
fi

echo "→ Host nginx updated (API → 127.0.0.1:${API_HOST_PORT}, web → 127.0.0.1:${WEB_HOST_PORT})"

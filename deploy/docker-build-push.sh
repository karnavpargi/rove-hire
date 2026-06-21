#!/usr/bin/env bash
# Build API, web, and db-setup images and push to a container registry.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG:-$ROOT_DIR/deploy/deploy.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE"
  echo "Copy deploy/deploy.env.example to deploy/deploy.env and set DOCKER_REGISTRY."
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${DOCKER_REGISTRY:?DOCKER_REGISTRY is required (e.g. ghcr.io/youruser or docker.io/youruser)}"
: "${APP_URL:?APP_URL is required for NEXT_PUBLIC_GRAPHQL_URL}"

IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/arm64}"

API_IMAGE="${API_IMAGE:-${DOCKER_REGISTRY}/rove-hire-api:${IMAGE_TAG}}"
WEB_IMAGE="${WEB_IMAGE:-${DOCKER_REGISTRY}/rove-hire-web:${IMAGE_TAG}}"
DB_SETUP_IMAGE="${DB_SETUP_IMAGE:-${DOCKER_REGISTRY}/rove-hire-db-setup:${IMAGE_TAG}}"

export API_IMAGE WEB_IMAGE DB_SETUP_IMAGE

echo "→ Registry:  ${DOCKER_REGISTRY}"
echo "→ Tag:       ${IMAGE_TAG}"
echo "→ Platform:  ${DOCKER_PLATFORM}"
echo "→ API:       ${API_IMAGE}"
echo "→ Web:       ${WEB_IMAGE}"
echo "→ DB setup:  ${DB_SETUP_IMAGE}"

if ! docker buildx version >/dev/null 2>&1; then
  echo "docker buildx is required. Install Docker Desktop or enable buildx."
  exit 1
fi

if [[ -n "${DOCKER_REGISTRY_TOKEN:-}" ]]; then
  REGISTRY_HOST="${DOCKER_REGISTRY%%/*}"
  echo "→ Logging into ${REGISTRY_HOST}"
  echo "${DOCKER_REGISTRY_TOKEN}" | docker login "${REGISTRY_HOST}" -u "${DOCKER_REGISTRY_USER:-}" --password-stdin
fi

BUILDER_NAME="rove-hire-builder"
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  docker buildx create --name "$BUILDER_NAME" --use
else
  docker buildx use "$BUILDER_NAME"
fi

BUILD_ARGS=(
  --platform "$DOCKER_PLATFORM"
  --push
)

echo "→ Building and pushing API (production)..."
docker buildx build "${BUILD_ARGS[@]}" \
  -f "$ROOT_DIR/apps/api/Dockerfile" \
  --target production \
  -t "$API_IMAGE" \
  "$ROOT_DIR"

echo "→ Building and pushing db-setup..."
docker buildx build "${BUILD_ARGS[@]}" \
  -f "$ROOT_DIR/apps/api/Dockerfile" \
  --target db-setup \
  -t "$DB_SETUP_IMAGE" \
  "$ROOT_DIR"

echo "→ Building and pushing Web (NEXT_PUBLIC_GRAPHQL_URL=${APP_URL}/graphql)..."
docker buildx build "${BUILD_ARGS[@]}" \
  -f "$ROOT_DIR/apps/web/Dockerfile" \
  --target production \
  --build-arg "NEXT_PUBLIC_GRAPHQL_URL=${APP_URL}/graphql" \
  -t "$WEB_IMAGE" \
  "$ROOT_DIR"

echo ""
echo "→ Images pushed successfully"
echo "   API:      ${API_IMAGE}"
echo "   Web:      ${WEB_IMAGE}"
echo "   DB setup: ${DB_SETUP_IMAGE}"
echo ""
echo "Next: pnpm deploy:registry"

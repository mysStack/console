#!/usr/bin/env bash

set -ex
set -o pipefail

TAG=${TAG:-latest}
REPO=${REPO:-kubespheredev}
DRY_RUN=${DRY_RUN:-false}

# support other container tools. e.g. podman
CONTAINER_CLI=${CONTAINER_CLI:-docker}
CONTAINER_BUILDER=${CONTAINER_BUILDER:-"buildx build"}

## supported platforms
PLATFORMS=linux/amd64,linux/arm64

# project dir
PROJECT_DIR="$(dirname "$(realpath "$0")")"/..

# build out
${CONTAINER_CLI} run --rm -v "$PROJECT_DIR":/builder/ \
  node:16.14-alpine3.15 sh -c "cd /builder/ && yarn && yarn build"

# `ksc build:prod` reports webpack errors but still exits 0, so a failed client
# build used to sail through and produce an image that serves a blank page (the
# server templates interpolate the missing chunk names as empty strings).
# Trust the artifacts, not the exit code.
if [ ! -f "$PROJECT_DIR/dist/manifest.json" ]; then
  echo "ERROR: client bundle was not produced (dist/manifest.json is missing)" >&2
  exit 1
fi
if ! ls "$PROJECT_DIR"/dist/js/main.*.js >/dev/null 2>&1; then
  echo "ERROR: client bundle was not produced (dist/js/main.*.js is missing)" >&2
  exit 1
fi

sudo chown $(id -u):$(id -g) -R $PROJECT_DIR/dist
sudo chown $(id -u):$(id -g) -R $PROJECT_DIR/server

# build out dir
rm -rf "$PROJECT_DIR"/out/
mkdir -p "$PROJECT_DIR"/out/server
# generate version file to out
"$PROJECT_DIR"/hack/version.sh > "$PROJECT_DIR"/out/version.txt

mv "$PROJECT_DIR"/dist/ "$PROJECT_DIR"/package.json "$PROJECT_DIR"/out/
mv "$PROJECT_DIR"/server/locales \
  "$PROJECT_DIR"/server/public \
  "$PROJECT_DIR"/server/views \
  "$PROJECT_DIR"/server/sample \
  "$PROJECT_DIR"/server/configs "$PROJECT_DIR"/out/server/

if [ "$DRY_RUN" = "false" ]; then
  # shellcheck disable=SC2086 # inteneded splitting of CONTAINER_BUILDER
  ${CONTAINER_CLI} ${CONTAINER_BUILDER} \
    --platform ${PLATFORMS} \
    --push \
    -f build/Dockerfile.dapper \
    -t "${REPO}"/ks-console:"${TAG}" .
fi

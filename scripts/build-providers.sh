#!/usr/bin/env bash
# Build each cloud provider entrypoint (packages/cli/src/<cloud>/main.ts) into a
# standalone <cloud>.js bundle. These are published to the rolling
# <cloud>-latest GitHub releases and downloaded by sh/<cloud>/<agent>.sh on the VM.
#
# Mirrors the CLI bundle build in packages/cli/package.json (build:cli).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "${SCRIPT_DIR}/../packages/cli" && pwd)"
cd "${CLI_DIR}"

# Keep in sync with the cloud list in .github/workflows/release-providers.yml
# and the sh/<cloud>/ directories.
CLOUDS=(local digitalocean gcp aws hetzner daytona sprite)

OUT_DIR="dist"
mkdir -p "${OUT_DIR}"

for cloud in "${CLOUDS[@]}"; do
  entry="src/${cloud}/main.ts"
  if [ ! -f "${entry}" ]; then
    echo "[build-providers] ERROR: ${entry} not found" >&2
    exit 1
  fi
  echo "[build-providers] building ${OUT_DIR}/${cloud}.js from ${entry}"
  npx --yes bun@1.3.9 build "${entry}" \
    --outfile "${OUT_DIR}/${cloud}.js" \
    --target bun --minify --packages bundle
done

echo "[build-providers] built ${#CLOUDS[@]} provider bundles into packages/cli/${OUT_DIR}/"

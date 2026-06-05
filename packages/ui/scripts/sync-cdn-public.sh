#!/bin/bash
# Sync CDN artifacts from the monorepo root into packages/ui/public/
# so Vercel serves them alongside the Next.js UI.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${UI_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

# Always refresh from repo root to keep public/ in sync
mkdir -p "${UI_DIR}/public/assets"

rm -f "${UI_DIR}/public/manifest.json"
cp "${REPO_ROOT}/manifest.json" "${UI_DIR}/public/manifest.json"

rm -rf "${UI_DIR}/public/sh"
cp -R "${REPO_ROOT}/sh" "${UI_DIR}/public/sh"

# Bake this environment's CDN origin into the published install.sh so the
# installer pins the CLI to whichever environment served it (dev/staging/prod).
# Vercel sets NEXT_PUBLIC_AGENTSEA_PUBLIC_ORIGIN per environment.
_origin="${NEXT_PUBLIC_AGENTSEA_PUBLIC_ORIGIN:-}"
_install_sh="${UI_DIR}/public/sh/cli/install.sh"
if [ -n "${_origin}" ] && [ -f "${_install_sh}" ]; then
  case "${_origin}" in
    https://*|http://*)
      ORIGIN="${_origin%/}" perl -i -pe \
        's/^AGENTSEA_CDN_DEFAULT=".*"/AGENTSEA_CDN_DEFAULT="$ENV{ORIGIN}"/' "${_install_sh}"
      echo "[sync-cdn-public] baked CDN origin into install.sh: ${_origin%/}"
      ;;
    *)
      echo "[sync-cdn-public] WARNING: NEXT_PUBLIC_AGENTSEA_PUBLIC_ORIGIN ('${_origin}') is not http(s) — leaving install.sh default"
      ;;
  esac
else
  echo "[sync-cdn-public] NEXT_PUBLIC_AGENTSEA_PUBLIC_ORIGIN unset — install.sh keeps its built-in default origin"
fi

# assets/ already has agent and cloud images for the UI;
# sync from repo root to include any newer or additional images.
rm -rf "${UI_DIR}/public/assets"
cp -R "${REPO_ROOT}/assets" "${UI_DIR}/public/assets"

echo "[sync-cdn-public] synced manifest.json, sh/, assets/ → packages/ui/public/"

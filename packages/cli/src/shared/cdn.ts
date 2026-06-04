// shared/cdn.ts — Resolve the CDN origin agentsea fetches scripts + one-liners from.
//
// This is what lets the CLI "know" which environment (dev / staging / prod) it
// belongs to without shipping a different binary per environment:
//
//   1. AGENTSEA_CDN env var ............ explicit runtime override (highest)
//   2. ~/.config/agentsea/cdn-origin ... pinned by install.sh to the origin the
//      CLI was installed from. Each environment serves an install.sh with its own
//      origin baked in (injected at deploy time by packages/ui/scripts/sync-cdn-public.sh),
//      and the installer persists it here — so a CLI installed from
//      agentsea.dev.thegrid.ai keeps fetching from dev, prod from prod, etc.
//   3. AGENTSEA_DEFAULT_CDN ............. built-in fallback (lowest)
//
// The per-cloud agent bundles are fetched from GitHub releases (not the CDN), so
// they are environment-independent and intentionally not routed through here.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getAgentseaDir } from "./paths.js";

/**
 * Last-resort origin when neither AGENTSEA_CDN nor an install-time pin is set.
 * Points at the currently-live deployment. Update this (and set each Vercel
 * environment's NEXT_PUBLIC_AGENTSEA_PUBLIC_ORIGIN) once a production host exists.
 */
export const AGENTSEA_DEFAULT_CDN = "https://agentsea.dev.thegrid.ai";

/** File under the agentsea config dir where install.sh pins the install origin. */
export const CDN_ORIGIN_FILE = "cdn-origin";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readPinnedOrigin(): string | undefined {
  try {
    const raw = readFileSync(join(getAgentseaDir(), CDN_ORIGIN_FILE), "utf8").trim();
    return /^https?:\/\/\S+$/.test(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Origin (scheme + host, no trailing slash) the CLI fetches CDN assets from:
 * the per-cloud agent script (`{origin}/{cloud}/{agent}.sh`), the GitHub-auth and
 * sprite helper one-liners, and the install/update commands shown to the user.
 */
export function getCdnOrigin(): string {
  const fromEnv = process.env.AGENTSEA_CDN?.trim();
  if (fromEnv) {
    return stripTrailingSlash(fromEnv);
  }
  const pinned = readPinnedOrigin();
  if (pinned) {
    return stripTrailingSlash(pinned);
  }
  return AGENTSEA_DEFAULT_CDN;
}

// shared/paths.ts — Centralized filesystem path resolution for agentsea

import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

/** Return the user's home directory, preferring $HOME over os.homedir(). */
export function getUserHome(): string {
  return process.env.HOME || homedir();
}

const CONFIG_SEGMENT = ".config/agentsea" as const;
const LEGACY_CONFIG_SEGMENT = ".config/agentsea" as const;
const CACHE_DIR_NAME = "agentsea" as const;
const LEGACY_CACHE_DIR_NAME = "agentsea" as const;

let legacyHomeWarned = false;

function warnLegacyHomeEnv(): void {
  if (legacyHomeWarned) return;
  legacyHomeWarned = true;
  process.stderr.write(
    "[agentsea] GRID_SPAWN_HOME / SPAWN_HOME is deprecated — use AGENTSEA_HOME instead.\n",
  );
}

function resolveAgentSeaHome(homePath: string): string {
  if (!isAbsolute(homePath)) {
    throw new Error(
      `AGENTSEA_HOME must be an absolute path (got "${homePath}").\n` +
        "Example: export AGENTSEA_HOME=/home/user/.config/agentsea",
    );
  }
  const resolved = resolve(homePath);
  const userHome = getUserHome();
  if (!resolved.startsWith(userHome + "/") && resolved !== userHome) {
    throw new Error(
      "AGENTSEA_HOME must be within your home directory.\n" + `Got: ${resolved}\n` + `Home: ${userHome}`,
    );
  }
  return resolved;
}

/** Resolve agentsea data dir (spawn history lives here). Respects AGENTSEA_HOME with legacy fallbacks. */
export function getSpawnDir(): string {
  const agentSeaHome = process.env.AGENTSEA_HOME?.trim();
  if (agentSeaHome) {
    return resolveAgentSeaHome(agentSeaHome);
  }

  const legacyHome = process.env.GRID_SPAWN_HOME || process.env.SPAWN_HOME;
  if (legacyHome) {
    warnLegacyHomeEnv();
    return resolveAgentSeaHome(legacyHome);
  }

  const home = getUserHome();
  const newDir = join(home, CONFIG_SEGMENT);
  const oldDir = join(home, LEGACY_CONFIG_SEGMENT);
  if (!existsSync(newDir) && existsSync(oldDir)) {
    return oldDir;
  }
  return newDir;
}

/** Path to the spawn history file. */
export function getHistoryPath(): string {
  return join(getSpawnDir(), "history.json");
}

/** Crash-safe provision checkpoints (~/.config/agentsea/runs/). */
export function getProvisionRunsDir(): string {
  return join(getSpawnDir(), "runs");
}

/**
 * Per-cloud credential JSON: ~/.config/agentsea/{cloud}.json
 */
export function getSpawnCloudConfigPath(cloud: string): string {
  return join(getSpawnDir(), `${cloud}.json`);
}

export function getSpawnPreferencesPath(): string {
  return join(getSpawnDir(), "preferences.json");
}

export function getInstallRefPath(): string {
  return join(getSpawnDir(), ".ref");
}

export function getInstallIdPath(): string {
  return join(getSpawnDir(), ".telemetry-id");
}

function resolveCacheDirName(): string {
  const home = getUserHome();
  const cacheRoot = process.env.XDG_CACHE_HOME || join(home, ".cache");
  const newDir = join(cacheRoot, CACHE_DIR_NAME);
  const oldDir = join(cacheRoot, LEGACY_CACHE_DIR_NAME);
  if (!existsSync(newDir) && existsSync(oldDir)) {
    return LEGACY_CACHE_DIR_NAME;
  }
  return CACHE_DIR_NAME;
}

/** Manifest cache layout — prefers ~/.cache/agentsea with legacy fallback */
export function getCacheDir(): string {
  return join(process.env.XDG_CACHE_HOME || join(getUserHome(), ".cache"), resolveCacheDirName());
}

export function getCacheFile(): string {
  return join(getCacheDir(), "manifest.json");
}

export function getUpdateFailedPath(): string {
  return join(getSpawnDir(), ".update-failed");
}

export function getUpdateCheckedPath(): string {
  return join(getSpawnDir(), ".update-checked");
}

export function getSshDir(): string {
  return join(getUserHome(), ".ssh");
}

export function getTmpDir(): string {
  return tmpdir();
}

export const RC_MARKER_START = "# >>> agentsea >>>";
export const RC_MARKER_END = "# <<< agentsea <<<";

export const RC_MARKER_LEGACY = "# Added by agentsea installer";

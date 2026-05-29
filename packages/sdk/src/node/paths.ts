import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function getUserHome(): string {
  return process.env.HOME || homedir();
}

/** Disk cache for downloaded manifest (XDG). Prefers agentsea with legacy agentsea fallback. */
export function getManifestCacheDir(): string {
  const cacheRoot = process.env.XDG_CACHE_HOME || join(getUserHome(), ".cache");
  const newDir = join(cacheRoot, "agentsea");
  const oldDir = join(cacheRoot, "agentsea");
  if (!existsSync(newDir) && existsSync(oldDir)) {
    return oldDir;
  }
  return newDir;
}

export function getManifestCacheFile(): string {
  return join(getManifestCacheDir(), "manifest.json");
}

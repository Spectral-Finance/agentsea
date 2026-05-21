#!/usr/bin/env node
/**
 * Prints agent slugs for E2E: manifest sort (GitHub stars desc), non-disabled,
 * matrix cell <cloud>/<slug> === "implemented".
 *
 * Usage: node scripts/list-e2e-agents.mjs <cloud> [--first <slug>]
 *
 * Resolves repo root from SPAWN_CLI_DIR or this file's parent directory.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveRepoRoot() {
  const env = process.env.SPAWN_CLI_DIR;
  if (env && existsSync(join(env, "manifest.json"))) {
    return env;
  }
  return join(__dirname, "..");
}

const args = process.argv.slice(2);
let first = null;
let cloud = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--first" && args[i + 1]) {
    first = args[++i];
    continue;
  }
  if (!a.startsWith("--")) {
    cloud = a;
    break;
  }
}

if (!cloud) {
  console.error("Usage: list-e2e-agents.mjs <cloud> [--first <slug>]");
  process.exit(1);
}

const manifestPath = join(resolveRepoRoot(), "manifest.json");
const raw = readFileSync(manifestPath, "utf8");
const m = JSON.parse(raw);

const keys = Object.keys(m.agents ?? {})
  .filter((k) => !m.agents[k]?.disabled)
  .sort((a, b) => (m.agents[b]?.github_stars ?? 0) - (m.agents[a]?.github_stars ?? 0));

const implemented = keys.filter((slug) => m.matrix?.[`${cloud}/${slug}`] === "implemented");

let ordered = implemented;
if (first && implemented.includes(first)) {
  ordered = [first, ...implemented.filter((s) => s !== first)];
}

process.stdout.write(ordered.join(" "));

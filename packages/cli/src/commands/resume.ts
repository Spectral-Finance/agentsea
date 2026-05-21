// grid-spawn resume - continue provisioning from last recorded phase

import type { SpawnRecord } from "../history.js";

import * as p from "@clack/prompts";
import { getErrorMessage } from "@grid-spawn/sdk";
import pc from "picocolors";
import {
  isProvisioningIncomplete,
  listProvisionCheckpoints,
  loadHistory,
  patchSpawnRecord,
  upsertSpawnRecord,
} from "../history.js";
import { loadManifest } from "../manifest.js";
import { asyncTryCatch } from "../shared/result.js";
import { resumeOrchestrationFromRecord } from "../shared/orchestrate.js";
import { GRID_SPAWN_CLI } from "../shared/cli-invocation.js";
import { buildRecordLabel, buildRecordSubtitle } from "./list.js";
import { handleCancel, isInteractiveTTY } from "./shared.js";

function findIncompleteFromHistory(): SpawnRecord[] {
  return loadHistory().filter(isProvisioningIncomplete);
}

/** Merge crash-safe checkpoints into history when the main file missed the write. */
export function recoverProvisionCheckpoints(): number {
  const historyIds = new Set(loadHistory().map((r) => r.id));
  let n = 0;
  for (const rec of listProvisionCheckpoints()) {
    if (!rec.id || !rec.connection) {
      continue;
    }
    if (historyIds.has(rec.id)) {
      continue;
    }
    upsertSpawnRecord(rec);
    historyIds.add(rec.id);
    n++;
  }
  return n;
}

export async function cmdResume(spawnId?: string, opts?: { recoverOnly?: boolean }): Promise<void> {
  if (opts?.recoverOnly) {
    const n = recoverProvisionCheckpoints();
    if (n === 0) {
      p.log.info("No new provision checkpoints to import into history.");
    } else {
      p.log.success(`Imported ${n} spawn record(s) from ~/.config/grid-spawn/runs/.`);
      p.log.info("Run " + pc.cyan(`${GRID_SPAWN_CLI} resume`) + " to continue provisioning.");
    }
    return;
  }

  const recovered = recoverProvisionCheckpoints();
  if (recovered > 0) {
    p.log.info(`Recovered ${recovered} checkpoint(s) into history before resume.`);
  }

  const manifestResult = await asyncTryCatch(() => loadManifest());
  if (!manifestResult.ok) {
    p.log.error(`Failed to load manifest: ${getErrorMessage(manifestResult.error)}`);
    process.exit(1);
  }
  const manifest = manifestResult.data;

  const candidates = findIncompleteFromHistory();

  let record: SpawnRecord | undefined;

  if (spawnId) {
    record = candidates.find(
      (r) => r.id === spawnId || r.name === spawnId || r.connection?.server_name === spawnId,
    );
    if (!record) {
      p.log.error(
        `No incomplete spawn matched ${pc.bold(spawnId)}. Try ` +
          pc.cyan(`${GRID_SPAWN_CLI} list`) +
          " or " +
          pc.cyan(`${GRID_SPAWN_CLI} resume --recover`) +
          ".",
      );
      process.exit(1);
    }
  } else if (candidates.length === 1) {
    record = candidates[0];
  } else if (candidates.length === 0) {
    p.log.info("No incomplete spawns in history.");
    p.log.info("If a VM was created but history was lost, run " + pc.cyan(`${GRID_SPAWN_CLI} resume --recover`) + " first.");
    return;
  } else if (!isInteractiveTTY()) {
    p.log.error(`${GRID_SPAWN_CLI} resume needs a spawn id when multiple incomplete spawns exist.`);
    p.log.info("Usage: " + pc.cyan(GRID_SPAWN_CLI + " resume <spawn-id>"));
    process.exit(1);
  } else {
    const choice = await p.select({
      message: "Select a spawn to resume",
      options: candidates.map((r) => ({
        value: r.id,
        label: buildRecordLabel(r),
        hint: buildRecordSubtitle(r, manifest),
      })),
    });
    if (p.isCancel(choice)) {
      handleCancel();
    }
    record = candidates.find((r) => r.id === choice);
  }

  if (!record) {
    p.log.error("Spawn not found.");
    process.exit(1);
  }

  p.log.step("Resuming " + pc.bold(record.agent) + " on " + pc.bold(record.cloud) + "...");

  const runResult = await asyncTryCatch(() => resumeOrchestrationFromRecord(record!, manifest, undefined));
  if (!runResult.ok) {
    const msg = getErrorMessage(runResult.error);
    patchSpawnRecord(record.id, {
      provision_status: "failed",
      provision_error: msg.replace(/\s+/g, " ").trim().slice(0, 400),
    });
    p.log.error(msg);
    process.exit(1);
  }
}

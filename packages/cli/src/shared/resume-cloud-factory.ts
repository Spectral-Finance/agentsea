// Build a CloudOrchestrator wired to an existing VM (for resume / continue provisioning).

import type { SpawnRecord, VMConnection } from "../history.js";

import type { CloudOrchestrator } from "./orchestrate.js";

/** SSH-capable clouds where runServer/upload/download accept an optional IP. */
export async function buildCloudOrchestratorForResume(record: SpawnRecord): Promise<CloudOrchestrator | null> {
  const conn = record.connection;
  if (!conn?.ip || conn.deleted) {
    return null;
  }

  const cloudSlug = conn.cloud ?? record.cloud;

  if (cloudSlug === "digitalocean") {
    const doMod = await import("../digitalocean/digitalocean.js");
    await doMod.ensureDoToken();
    const ip = conn.ip;
    const vmConn: VMConnection = { ...conn };
    return {
      cloudName: "digitalocean",
      cloudLabel: "DigitalOcean",
      skipAgentInstall: false,
      runner: {
        runServer: (cmd, timeoutSecs) => doMod.runServer(cmd, timeoutSecs, ip),
        uploadFile: (localPath, remotePath) => doMod.uploadFile(localPath, remotePath, ip),
        downloadFile: (remotePath, localPath) => doMod.downloadFile(remotePath, localPath, ip),
      },
      async authenticate() {
        await doMod.ensureDoToken();
      },
      async promptSize() {},
      async createServer() {
        return vmConn;
      },
      getServerName: async () => conn.server_name ?? "grid-spawn-resume",
      async waitForReady() {
        await doMod.waitForSshOnly(ip);
      },
      interactiveSession: (cmd: string) => doMod.interactiveSession(cmd, ip),
      getConnectionInfo: () => ({
        host: ip,
        user: conn.user,
      }),
    };
  }

  if (cloudSlug === "hetzner") {
    const h = await import("../hetzner/hetzner.js");
    await h.ensureHcloudToken();
    const ip = conn.ip;
    const vmConn: VMConnection = { ...conn };
    return {
      cloudName: "hetzner",
      cloudLabel: "Hetzner Cloud",
      skipAgentInstall: false,
      runner: {
        runServer: (cmd, timeoutSecs) => h.runServer(cmd, timeoutSecs, ip),
        uploadFile: (localPath, remotePath) => h.uploadFile(localPath, remotePath, ip),
        downloadFile: (remotePath, localPath) => h.downloadFile(remotePath, localPath, ip),
      },
      async authenticate() {
        await h.ensureHcloudToken();
      },
      async promptSize() {},
      async createServer() {
        return vmConn;
      },
      getServerName: async () => conn.server_name ?? "grid-spawn-resume",
      async waitForReady() {
        await h.waitForCloudInit(ip);
      },
      interactiveSession: (cmd: string) => h.interactiveSession(cmd, ip),
      getConnectionInfo: () => ({
        host: ip,
        user: conn.user,
      }),
    };
  }

  return null;
}

import type { AgentseaRecord } from "../history.js";
import type { Manifest } from "../manifest.js";
import type { CloudRunner } from "../shared/agent-setup.js";

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mockClackPrompts } from "./test-helpers.js";

mockClackPrompts();

const { cmdFix } = await import("../commands/fix.js");

const manifest: Manifest = {
  agents: {
    openclaw: {
      name: "OpenClaw",
      launch: "openclaw",
      env: {
        THEGRID_API_KEY: "${THEGRID_API_KEY}",
      },
    },
    hermes: {
      name: "Hermes",
      launch: "hermes",
      env: {
        THEGRID_API_KEY: "${THEGRID_API_KEY}",
      },
    },
  },
  clouds: {},
  matrix: {},
};

function activeRecord(id: string, agent: string, ip: string): AgentseaRecord {
  return {
    id,
    agent,
    cloud: "aws",
    timestamp: "2026-06-15T00:00:00.000Z",
    connection: {
      ip,
      user: "root",
      cloud: "aws",
      server_name: id,
    },
  };
}

describe("cmdFix bulk repair", () => {
  let testDir = "";
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = {
      ...process.env,
    };
    testDir = join(process.env.HOME ?? "", `.agentsea-fix-bulk-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, {
      recursive: true,
    });
    process.env.AGENTSEA_HOME = testDir;
    process.env.THEGRID_API_KEY = "test-grid-key";
    spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, {
      recursive: true,
      force: true,
    });
    mock.restore();
  });

  it("repairs only matching agent records when --all is filtered by agent", async () => {
    const records = [
      activeRecord("openclaw-one", "openclaw", "198.51.100.10"),
      activeRecord("hermes-one", "hermes", "198.51.100.11"),
      activeRecord("openclaw-two", "openclaw", "198.51.100.12"),
    ];
    writeFileSync(join(testDir, "history.json"), JSON.stringify(records, null, 2));

    const commandsByIp = new Map<string, string[]>();
    const makeRunner = mock((ip: string): CloudRunner => {
      const commands = commandsByIp.get(ip) ?? [];
      commandsByIp.set(ip, commands);
      return {
        async runServer(cmd: string): Promise<void> {
          commands.push(cmd);
        },
        async uploadFile(_localPath: string, remotePath: string): Promise<void> {
          commands.push(`upload:${remotePath}`);
        },
        async downloadFile(): Promise<void> {},
      };
    });

    await cmdFix(undefined, {
      all: true,
      agent: "openclaw",
      manifest,
      makeRunner,
    });

    expect(makeRunner).toHaveBeenCalledTimes(2);
    expect(commandsByIp.has("198.51.100.10")).toBe(true);
    expect(commandsByIp.has("198.51.100.11")).toBe(false);
    expect(commandsByIp.has("198.51.100.12")).toBe(true);
    expect(commandsByIp.get("198.51.100.10")?.join("\n")).toContain("openclaw-gateway-wrapper");
    expect(commandsByIp.get("198.51.100.12")?.join("\n")).toContain("openclaw-gateway-wrapper");
  });
});

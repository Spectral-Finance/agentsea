import type { VMConnection } from "../history.js";
import type { CloudRunner } from "../shared/agent-setup.js";

import { describe, expect, it, mock } from "bun:test";
import { mockClackPrompts } from "./test-helpers.js";

mockClackPrompts();

const { runOpenClawReconnectPreflight } = await import("../commands/connect.js");

function recordingRunner(commands: string[]): CloudRunner {
  return {
    async runServer(cmd: string): Promise<void> {
      commands.push(cmd);
    },
    async uploadFile(): Promise<void> {},
    async downloadFile(): Promise<void> {},
  };
}

const sshConnection: VMConnection = {
  ip: "198.51.100.12",
  user: "root",
  cloud: "aws",
};

describe("runOpenClawReconnectPreflight", () => {
  it("runs the OpenClaw gateway pre-launch cleanup for SSH VMs", async () => {
    const commands: string[] = [];
    const makeRunner = mock((ip: string, user: string, keyOpts: string[]) => {
      expect(ip).toBe("198.51.100.12");
      expect(user).toBe("root");
      expect(keyOpts).toEqual(["-i", "/tmp/key"]);
      return recordingRunner(commands);
    });

    const ran = await runOpenClawReconnectPreflight(sshConnection, "openclaw", ["-i", "/tmp/key"], {
      makeRunner,
    });

    expect(ran).toBe(true);
    expect(makeRunner).toHaveBeenCalledTimes(1);
    expect(commands).toHaveLength(1);
    const normalizeMatch = commands[0].match(/printf '%s' '([^']+)' \| base64 -d > \/tmp\/oc-normalize\.mjs/);
    expect(normalizeMatch).not.toBeNull();
    const normalizeScript = Buffer.from(normalizeMatch![1], "base64").toString("utf8");
    expect(normalizeScript).toContain("AGENTSEA_OPENCLAW_HEARTBEAT_EVERY");
    expect(normalizeScript).toContain("cfg.agents.defaults.heartbeat");
    expect(commands[0]).toContain("openclaw-gateway-wrapper");
    expect(commands[0]).toContain("systemctl restart openclaw-gateway");
  });

  it("skips non-OpenClaw agents", async () => {
    const makeRunner = mock(() => recordingRunner([]));

    const ran = await runOpenClawReconnectPreflight(sshConnection, "hermes", [], {
      makeRunner,
    });

    expect(ran).toBe(false);
    expect(makeRunner).not.toHaveBeenCalled();
  });

  it("skips OpenClaw records that are not SSH VMs", async () => {
    const makeRunner = mock(() => recordingRunner([]));
    const cases: VMConnection[] = [
      {
        ...sshConnection,
        ip: "sprite-console",
        server_name: "sprite-test",
      },
      {
        ...sshConnection,
        cloud: "daytona",
        server_id: "sandbox-test",
      },
      {
        ...sshConnection,
        deleted: true,
      },
    ];

    for (const connection of cases) {
      const ran = await runOpenClawReconnectPreflight(connection, "openclaw", [], {
        makeRunner,
      });
      expect(ran).toBe(false);
    }

    expect(makeRunner).not.toHaveBeenCalled();
  });
});

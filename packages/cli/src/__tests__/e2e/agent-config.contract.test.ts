/**
 * Fast contract tests for createCloudAgents (no cloud, no SSH).
 * For real provision + verify on DigitalOcean, see digitalocean-agent-flows.test.ts
 * when GRIDSPAWN_RUN_DO_E2E=1 and credentials are set.
 */
import { describe, expect, it } from "bun:test";
import type { AgentConfig } from "../../shared/agents.js";
import { createCloudAgents, type CloudRunner } from "../../shared/agent-setup.js";
import { type E2eAgentSlug, E2E_AGENT_SLUGS } from "./e2e-agents.js";

const noopRunner: CloudRunner = {
  runServer: async () => {},
  uploadFile: async () => {},
  downloadFile: async () => {},
};

const { agents, resolveAgent } = createCloudAgents(noopRunner);

function assertSpawnRcEnvLines(lines: string[], slug: string): void {
  expect(lines.length, `${slug}: envVars should not be empty`).toBeGreaterThan(0);
  for (const line of lines) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    expect(m, `${slug}: invalid env line: ${JSON.stringify(line)}`).not.toBeNull();
  }
}

const GRID_ENV_SUBSTRINGS: Record<E2eAgentSlug, string[]> = {
  claude: ["THEGRID_API_KEY=test-key", "ANTHROPIC_BASE_URL=https://api.thegrid.ai/api", "ANTHROPIC_AUTH_TOKEN=test-key"],
  openclaw: ["THEGRID_API_KEY=test-key", "OPENAI_BASE_URL=https://api.thegrid.ai/v1", "OPENAI_API_KEY=test-key"],
  codex: ["THEGRID_API_KEY=test-key"],
  opencode: ["THEGRID_API_KEY=test-key"],
  kilocode: ["THEGRID_API_KEY=test-key", "KILO_OPEN_ROUTER_API_KEY=test-key"],
  hermes: ["THEGRID_API_KEY=test-key", "OPENAI_BASE_URL=https://api.thegrid.ai/v1", "OPENAI_API_KEY=test-key"],
  junie: ["JUNIE_THEGRID_API_KEY=test-key", "THEGRID_API_KEY=test-key"],
  cursor: ["THEGRID_API_KEY=test-key", "CURSOR_API_KEY=test-key"],
  pi: ["THEGRID_API_KEY=test-key"],
  t3code: [
    "THEGRID_API_KEY=test-key",
    "ANTHROPIC_BASE_URL=https://api.thegrid.ai/api/v1",
    "OPENAI_BASE_URL=https://api.thegrid.ai/v1",
  ],
};

function assertHeadlessPrompt(agent: AgentConfig, slug: E2eAgentSlug): void {
  if (slug === "t3code") {
    expect(agent.promptCmd, "t3code is GUI/tunnel-oriented; headless promptCmd omitted").toBeUndefined();
    return;
  }
  expect(typeof agent.promptCmd, `${slug}: promptCmd required for headless --prompt`).toBe("function");
  const sample = 'Reply with OK.\nSecond: echo "x"';
  const cmd = agent.promptCmd!(sample);
  expect(cmd.length, `${slug}: promptCmd output empty`).toBeGreaterThan(10);
  expect(cmd.includes("source ~/.spawnrc"), `${slug}: prompt should source ~/.spawnrc`).toBe(true);
}

describe("agent config contract (createCloudAgents, no cloud)", () => {
  it("exposes the same agent slugs as E2E ALL_AGENTS", () => {
    const keys = Object.keys(agents).sort();
    const expected = [...E2E_AGENT_SLUGS].sort();
    expect(keys).toEqual(expected);
  });

  describe.each([...E2E_AGENT_SLUGS])("agent %s", (slug) => {
    it("resolveAgent returns a usable AgentConfig", () => {
      const a = resolveAgent(slug);
      expect(a.name.length).toBeGreaterThan(0);
      expect(typeof a.install).toBe("function");
      expect(typeof a.envVars).toBe("function");
      expect(typeof a.launchCmd).toBe("function");
    });

    it("envVars produces valid .spawnrc pairs and expected Grid wiring", () => {
      const apiKey = "test-key";
      const lines = agents[slug].envVars(apiKey);
      const blob = lines.join("\n");
      assertSpawnRcEnvLines(lines, slug);
      for (const frag of GRID_ENV_SUBSTRINGS[slug]) {
        expect(blob.includes(frag), `${slug}: env missing ${frag}`).toBe(true);
      }
    });

    it("launchCmd is non-empty shell", () => {
      const cmd = agents[slug].launchCmd();
      expect(cmd.length).toBeGreaterThan(5);
    });

    it("headless prompt command policy", () => {
      assertHeadlessPrompt(agents[slug], slug);
    });
  });

  it("resolveAgent rejects unknown slugs", () => {
    expect(() => resolveAgent("not-an-agent")).toThrow(/Unknown agent/);
  });
});

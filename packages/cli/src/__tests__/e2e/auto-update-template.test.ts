/**
 * Regression: setupAutoUpdate() base64-encodes a wrapper that embeds agent updateCmd.
 * validateScriptTemplate() rejects "${" in that blob to avoid accidental JS interpolation.
 * Bash parameter expansion must use $VAR forms in updateCmd strings, not ${VAR}.
 */
import { describe, expect, it } from "bun:test";
import { createCloudAgents, type CloudRunner } from "../../shared/agent-setup.js";
import { E2E_AGENT_SLUGS } from "./e2e-agents.js";

const noopRunner: CloudRunner = {
  runServer: async () => {},
  uploadFile: async () => {},
  downloadFile: async () => {},
};

describe("auto-update updateCmd templates (no ${ for wrapper safety)", () => {
  const { agents } = createCloudAgents(noopRunner);

  for (const slug of E2E_AGENT_SLUGS) {
    const agent = agents[slug];
    if (!agent?.updateCmd) {
      it.skip(`${slug}: no updateCmd`);
      continue;
    }

    it(`${slug}: updateCmd must not contain dollar-brace (auto-update wrapper)`, () => {
      const cmd = agent.updateCmd!;
      expect(cmd).not.toMatch(/\$\{/);
    });
  }
});

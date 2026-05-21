import { describe, expect, it } from "bun:test";
import {
  T3_CODEX_UI_MODEL_ALIASES,
  T3_LAUNCH_CMD,
  T3_LAUNCH_SHELL_PREFIX,
  buildT3GridSettingsJson,
  buildT3PairingBrowserUrl,
  parseT3PairingCreateJson,
  resolveT3GridModelId,
  rewriteT3RemotePairingUrl,
} from "../shared/t3-config.js";

describe("t3-config", () => {
  it("defaults model id to agent-standard", () => {
    expect(resolveT3GridModelId()).toBe("agent-standard");
    expect(resolveT3GridModelId("")).toBe("agent-standard");
  });

  it("builds T3 settings with Grid catalogue model for codex", () => {
    const raw = buildT3GridSettingsJson("agent-standard");
    const parsed = JSON.parse(raw) as {
      textGenerationModelSelection: { instanceId: string; model: string };
      providers: { codex: { enabled: boolean; customModels: string[] } };
    };
    expect(parsed.textGenerationModelSelection).toEqual({
      instanceId: "codex",
      model: "agent-standard",
    });
    expect(parsed.providers.codex.enabled).toBe(true);
    expect(parsed.providers.codex.customModels).toContain("agent-standard");
    expect(parsed.providers.codex.customModels).toEqual(
      expect.arrayContaining([...T3_CODEX_UI_MODEL_ALIASES]),
    );
  });

  it("launch command joins prefix and server with semicolon", () => {
    expect(T3_LAUNCH_CMD.startsWith(T3_LAUNCH_SHELL_PREFIX)).toBe(true);
    expect(T3_LAUNCH_CMD).toContain("; t3 --port 3773 --host 127.0.0.1 --no-browser");
    expect(T3_LAUNCH_CMD).not.toMatch(/\} t3/);
  });

  it("launch shell prefix is valid one-line bash (semicolon-separated)", () => {
    expect(T3_LAUNCH_SHELL_PREFIX.includes("; source ~/.zshrc")).toBe(true);
    expect(T3_LAUNCH_SHELL_PREFIX).not.toMatch(/\bnull source/);
    expect(T3_LAUNCH_SHELL_PREFIX).not.toMatch(/\bnull export/);
    expect(T3_LAUNCH_SHELL_PREFIX).not.toMatch(/\bthen if/);
  });

  it("builds tunnel pairing URLs from remote log lines", () => {
    expect(buildT3PairingBrowserUrl(54321, "T9VS9ZXRW5UG")).toBe(
      "http://127.0.0.1:54321/pair#token=T9VS9ZXRW5UG",
    );
    expect(
      rewriteT3RemotePairingUrl("http://localhost:3773/pair#token=T9VS9ZXRW5UG", 54321),
    ).toBe("http://127.0.0.1:54321/pair#token=T9VS9ZXRW5UG");
  });

  it("parses t3 auth pairing create --json output", () => {
    const stdout = `noise\n{"id":"x","credential":"ABC123","pairUrl":"http://127.0.0.1:9/pair#token=ABC123"}\n`;
    expect(parseT3PairingCreateJson(stdout)?.credential).toBe("ABC123");
  });
});

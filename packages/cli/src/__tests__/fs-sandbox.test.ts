/**
 * Guardrail: verifies bunfig.toml preload redirects HOME into an isolated temp directory.
 */

import { describe, expect, it } from "bun:test";
import { basename } from "node:path";

describe("preload filesystem sandbox", () => {
  it("isolates HOME under tmp with spawn-test-home- prefix", () => {
    const home = process.env.HOME ?? "";
    expect(home.length).toBeGreaterThan(0);
    expect(basename(home)).toMatch(/^spawn-test-home-/);
  });

  it("sets sandboxed GRID_SPAWN_ROOT inside HOME", () => {
    const root = process.env.GRID_SPAWN_ROOT ?? "";
    const home = process.env.HOME ?? "";
    expect(root.startsWith(home)).toBe(true);
    expect(root).toContain("agentsea-root");
  });
});

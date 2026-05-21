import { describe, expect, it } from "bun:test";
import { GRID_SPAWN_CLI } from "../shared/cli-invocation.js";

describe("cli-invocation", () => {
  it("GRID_SPAWN_CLI matches npm exec binary name", () => {
    expect(GRID_SPAWN_CLI).toBe("grid-spawn");
  });
});
